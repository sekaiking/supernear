import { Buffer } from "node:buffer";
import { getRandomValues } from "node:crypto";
import { Bindings } from "..";
import {
  JWT_COOKIE_EXPIRATION_SECONDS,
  NONCE_EXPIRATION_SECONDS,
} from "../constants";

import { sign as signJWT } from "hono/jwt";
import { JWTPayload } from "hono/utils/jwt/types";

export const generateNonce = (): string => {
  const nonce = getRandomValues(new Uint8Array(32));
  return Buffer.from(nonce).toString("base64");
};

export const storeNonce = async (
  env: Bindings,
  nonce: string,
  accountId: string,
): Promise<void> => {
  const expirationTimestamp = Date.now() + NONCE_EXPIRATION_SECONDS * 1000;
  await env.NONCE_STORE.put(
    `nonce:${nonce}`,
    JSON.stringify({ accountId, expirationTimestamp }),
    {
      expirationTtl: NONCE_EXPIRATION_SECONDS,
    },
  );
};

export const verifyNonce = async (
  env: Bindings,
  nonce: string,
  accountId: string,
): Promise<boolean> => {
  const storedNonceData = await env.NONCE_STORE.get(`nonce:${nonce}`);
  if (!storedNonceData) return false;

  const { accountId: storedAccountId, expirationTimestamp } =
    JSON.parse(storedNonceData);
  if (storedAccountId !== accountId || Date.now() > expirationTimestamp)
    return false;

  // Delete the nonce after successful verification to prevent reuse
  await env.NONCE_STORE.delete(`nonce:${nonce}`);
  return true;
};

export interface AuthJWTPayload extends JWTPayload {
  accountId: string;
  publicKey: string;
}

export const createJWT = (
  secret: string,
  publicKey: string,
  accountId: string,
): Promise<string> => {
  const payload: AuthJWTPayload = {
    publicKey: publicKey,
    accountId: accountId,
    exp: Math.floor(Date.now() / 1000) + JWT_COOKIE_EXPIRATION_SECONDS,
    plan: "free",
  };
  return signJWT(payload, secret);
};
