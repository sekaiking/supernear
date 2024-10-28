import { verify as verifyJWT } from "hono/jwt";
import { createMiddleware } from "hono/factory";
import { getCookie, deleteCookie } from "hono/cookie";
import type { Bindings, Variables } from "..";
import { AuthJWTPayload } from "./utils";
import { JWT_COOKIE_KEY } from "../constants";

export const jwt_middleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const token = getCookie(c, JWT_COOKIE_KEY);

  if (!token) {
    return c.json({ error: "Authentication required" }, 401);
  }

  try {
    const payload = (await verifyJWT(token, c.env.SECRET)) as AuthJWTPayload;

    if (payload.exp && payload.exp < Date.now() / 1000) {
      deleteCookie(c, JWT_COOKIE_KEY);
      return c.json({ error: "Token expired" }, 401);
    }

    c.set("user", payload);
    await next();
  } catch {
    deleteCookie(c, JWT_COOKIE_KEY);
    return c.json({ error: "Invalid token" }, 401);
  }
});
