import { SuperContext } from "..";
import { Buffer } from "node:buffer";
import { getRandomValues } from "node:crypto";
import { Bindings } from "..";
import { NONCE_EXPIRATION_SECONDS } from "../constants";
import { SignMessageParamsWithEncodedNonce } from "./types";

export const route_auth_get_nonce = async (c: SuperContext) => {
  const { accountId } = await c.req.json<{ accountId: string }>();
  if (!accountId) {
    return c.json({ error: "Account ID is required" }, 400);
  }

  const nonce = generateNonce();
  await storeNonce(c.env, nonce, accountId);

  const message = `Authenticate with your NEAR wallet\nNonce: ${nonce}`;

  const signParams: SignMessageParamsWithEncodedNonce = {
    message,
    nonce,
    recipient: c.env.CONTRACT_ID,
  };

  return c.json({
    message,
    nonce,
    signParams,
  });
};

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
