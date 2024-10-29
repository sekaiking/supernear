import { SuperContext } from "..";
import { verifyFullKeyBelongsToUser, verifySignature } from "./signature";
import { createJWT, getDomainFromRequest, verifyNonce } from "./utils";
import {
  CLIENT_COOKIE_KEY,
  JWT_COOKIE_EXPIRATION_SECONDS,
  JWT_COOKIE_KEY,
} from "../constants";
import { setCookie } from "hono/cookie";

export const route_auth_signin = async (c: SuperContext) => {
  const {
    signature,
    message,
    nonce,
    recipient,
    publicKey,
    accountId,
    callbackUrl,
  } = await c.req.json<{
    signature: string;
    message: string;
    nonce: string;
    recipient: string;
    publicKey: string;
    accountId: string;
    callbackUrl?: string;
  }>();

  if (!(signature && message && nonce && recipient && publicKey && accountId)) {
    return c.json({ error: "Invalid request" }, 400);
  }

  // Verify nonce
  const isNonceValid = await verifyNonce(c.env, nonce, accountId);
  if (!isNonceValid) {
    return c.json({ error: "Invalid or expired nonce" }, 401);
  }

  // Verify signature
  const isSignatureValid = await verifySignature(
    {
      message,
      nonce: Buffer.from(nonce, "base64"),
      recipient,
      callbackUrl,
    },
    publicKey,
    signature,
  );
  if (!isSignatureValid) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  // Verify publickey belongs to user
  const isPkBelongToUser = await verifyFullKeyBelongsToUser(
    publicKey,
    accountId,
    c.env.NEAR_RPC,
  );
  if (!isPkBelongToUser) {
    return c.json({ error: "Public key and account id don't match" }, 401);
  }

  // Create JWT token
  const token = await createJWT(c.env.SECRET, publicKey, accountId);
  const expires = new Date(
    new Date().getTime() + JWT_COOKIE_EXPIRATION_SECONDS * 1000,
  );

  const domain = getDomainFromRequest(c);
  console.log(domain);

  // Set JWT token
  setCookie(c, JWT_COOKIE_KEY, token, {
    path: "/",
    secure: true,
    httpOnly: true,
    domain,
    maxAge: JWT_COOKIE_EXPIRATION_SECONDS,
    expires: expires,
    sameSite: "Strict",
  });

  // Set an additional non-httpOnly cookie for the client
  setCookie(
    c,
    CLIENT_COOKIE_KEY,
    JSON.stringify({
      publicKey,
      accountId,
      expires: expires,
    }),
    {
      maxAge: JWT_COOKIE_EXPIRATION_SECONDS,
      expires: expires,
      domain,
    },
  );

  return c.json({ success: true }, 200);
};
