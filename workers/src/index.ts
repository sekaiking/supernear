import { Context, Hono } from "hono";
import { cors } from "hono/cors";
import { route_ai_super, route_ai_intent_train } from "./superai";
import {
  jwt_middleware,
  route_auth_get_nonce,
  route_auth_signin,
  route_auth_signout,
} from "./auth";
import { AuthJWTPayload } from "./auth/utils";
import { planRateLimiterMiddleware, route_plans_clear_cache } from "./plans";

export type Bindings = {
  NONCE_STORE: KVNamespace;
  PLANS_RATE_LIMIT_STORE: KVNamespace;
  CACHED_USER_PLANS: KVNamespace;
  AI: Ai;
  VECTOR_INDEX: VectorizeIndex;
  CONTRACT_ID: string;
  SECRET: string;
  NEAR_RPC: string;
};
export type Variables = {
  user?: AuthJWTPayload;
};

export type SuperContext = Context<{
  Bindings: Bindings;
  Variables: Variables;
}>;

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.get("/", async (c) => {
  return c.text("Hello, Super");
});

app.use(
  "/api/*",
  cors({
    origin: [
      "http://localhost:3000",
      "https://www.supernear.app",
      "https://supernear.app",
    ],
    credentials: true,
  }),
);

app.get("/api/test", jwt_middleware, async (c) => {
  return c.text("Woohoo! it's working!");
});

// auth
app.post("/api/auth/nonce", route_auth_get_nonce);
app.post("/api/auth/signin", route_auth_signin);
app.post("/api/auth/signout", route_auth_signout);

// ai
app.post("/api/ai/intent/train", jwt_middleware, route_ai_intent_train);
app.post(
  "/api/ai/super",
  jwt_middleware,
  planRateLimiterMiddleware,
  route_ai_super,
);

// plans
app.post("/api/plans/clearCache", jwt_middleware, route_plans_clear_cache);

export default app;
