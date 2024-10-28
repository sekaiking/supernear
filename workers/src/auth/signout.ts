import { setCookie } from "hono/cookie";
import { SuperContext } from "..";
import { CLIENT_COOKIE_KEY, JWT_COOKIE_KEY } from "../constants";

export const route_auth_signout = async (c: SuperContext) => {
  setCookie(c, JWT_COOKIE_KEY, "", {
    path: "/",
    secure: true,
    domain: "localhost",
    httpOnly: true,
    maxAge: 0,
    expires: new Date(0),
    sameSite: "Strict",
  });

  setCookie(c, CLIENT_COOKIE_KEY, "", {
    path: "/",
    secure: true,
    domain: "localhost",
    maxAge: 0,
    expires: new Date(0),
  });

  return c.json({ success: true }, 200);
};
