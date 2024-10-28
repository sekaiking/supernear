import { createMiddleware } from "hono/factory";
import { Bindings, SuperContext, Variables } from ".";
import { AuthJWTPayload } from "./auth/utils";

interface RateLimitConfig {
  dailyLimit: number;
  minuteLimit?: number;
  /// if user have multiple plans, the one with higher priority will be considered
  priority: number;
}

export const PLANS: Record<string, RateLimitConfig> = {
  free: {
    dailyLimit: 20,
    minuteLimit: 5,
    priority: 0,
  },
  premium: {
    dailyLimit: 1000,
    minuteLimit: 20,
    priority: 1,
  },
};

export const planRateLimiterMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const user: AuthJWTPayload = c.get("user")!;
  const plan = await get_user_plan(c, user.accountId);
  const kv = c.env.PLANS_RATE_LIMIT_STORE;

  const { dailyLimit, minuteLimit } = PLANS[plan.plan];
  const userId = user.accountId;
  const now = new Date();
  const currentDay = now.toISOString().split("T")[0];

  // Keys for KV store
  const dailyKey = `${userId}:daily:${currentDay}`;
  const minuteKey = `${userId}:minute:${now.getMinutes()}`;

  // Get current counts
  const [dailyCount, minuteCount] = await Promise.all([
    kv.get(dailyKey, "json") as Promise<number>,
    minuteLimit
      ? (kv.get(minuteKey, "json") as Promise<number>)
      : Promise.resolve(0),
  ]);

  // Check daily limit
  if (dailyCount >= dailyLimit) {
    return c.json(
      {
        message:
          "Daily rate limit exceeded, to increase your rate limit consider using a payed plan.",
      },
      429,
      {
        "X-RateLimit-Limit": dailyLimit.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": getEndOfDay(),
      },
    );
  }

  // Check minute limit
  if (minuteLimit && minuteCount >= minuteLimit) {
    return c.json(
      {
        message:
          "Per-minute rate limit exceeded, to increase your rate limit consider using a payed plan.",
      },
      429,
      {
        "X-RateLimit-Limit": minuteLimit.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": (now.getTime() + 60000).toString(),
      },
    );
  }

  // Increment counters
  const operations = [
    kv.put(dailyKey, JSON.stringify((dailyCount || 0) + 1), {
      expirationTtl: 86400, // 24 hours
    }),
  ];

  if (minuteLimit) {
    operations.push(
      kv.put(minuteKey, JSON.stringify((minuteCount || 0) + 1), {
        expirationTtl: 60, // 1 minute
      }),
    );
  }

  await Promise.all(operations);

  await next();

  // Add rate limit headers
  c.res.headers.append("X-RateLimit-Limit", dailyLimit.toString());
  c.res.headers.append(
    "X-RateLimit-Remaining",
    (dailyLimit - (dailyCount || 0) - 1).toString(),
  );
});

// Helper function to get end of current day in Unix timestamp
function getEndOfDay(): string {
  const now = new Date();
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  return endOfDay.getTime().toString();
}

export async function route_plans_clear_cache(c: SuperContext) {
  const user: AuthJWTPayload = c.get("user")!;
  c.env.CACHED_USER_PLANS.delete(user.accountId);
  return c.json({ success: true }, 200);
}

export async function get_user_plan(
  c: SuperContext,
  accountId: string,
): Promise<{
  plan: keyof typeof PLANS;
  ends: number;
  cached?: boolean;
}> {
  const args = JSON.stringify({
    user_id: accountId,
  });
  const cached = await c.env.CACHED_USER_PLANS.get(accountId).catch((e) =>
    console.error(e),
  );
  if (!!cached) {
    try {
      return { cached: true, ...JSON.parse(cached) };
    } catch (e) {
      console.error(e);
      c.env.CACHED_USER_PLANS.delete(accountId);
    }
  }

  const body = {
    method: "query",
    params: {
      request_type: "call_function",
      account_id: c.env.CONTRACT_ID,
      method_name: "get_user_subscriptions",
      args_base64: Buffer.from(args).toString("base64"),
      finality: "optimistic",
    },
    id: "dontcare",
    jsonrpc: "2.0",
  };
  const userPlan = await fetch(c.env.NEAR_RPC, {
    method: "post",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  })
    .then((data) => data.json())
    .then((response: any) => {
      try {
        const result: Record<string, any> = JSON.parse(
          Buffer.from(response.result.result).toString(),
        );
        const validPlans: Array<keyof typeof PLANS> = Object.keys(PLANS).filter(
          (p) => {
            if (Object.hasOwn(result, p)) {
              // check if still valid
              if (Number(result[p].subscription_ends) > Date.now()) {
                return true;
              }
            }
            return false;
          },
        );
        if (!validPlans.length) {
          return { plan: "free", ends: 40000000000000 };
        }
        const plan = validPlans.sort((a, b) => {
          return PLANS[a].priority - PLANS[b].priority;
        })[0];
        return { plan, ends: Number(result[plan].subscription_ends) };
      } catch (e) {
        console.error(e);
        return { plan: "free", ends: 40000000000000, byError: true };
      }
    })
    .catch((r) => {
      console.error("Something went wrong when calling RPC", r);
      return { plan: "free", ends: 40000000000000, byError: true };
    });

  // put in cache
  if (userPlan.plan == "free") {
    console.log("setting cache for", accountId);
    if (userPlan.byError) {
      await c.env.CACHED_USER_PLANS.put(accountId, JSON.stringify(userPlan), {
        expirationTtl: 60, // 1 minute
      });
    } else {
      await c.env.CACHED_USER_PLANS.put(accountId, JSON.stringify(userPlan), {
        expirationTtl: 5 * 60, // 5 minute
      });
    }
  } else {
    console.log("setting cache for", accountId);
    await c.env.CACHED_USER_PLANS.put(accountId, JSON.stringify(userPlan), {
      expiration: Math.floor(userPlan.ends / 1000), // until plan ends
      expirationTtl: 24 * 60 * 60, // or 1 day
    });
  }

  return userPlan;
}
