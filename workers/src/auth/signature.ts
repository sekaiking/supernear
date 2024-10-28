import { Schema, serialize } from "borsh";
import { sha256 } from "js-sha256";
import { PublicKey } from "@near-js/crypto";
import { SignMessageParams } from "./types";

export class SignaturePayload {
  tag: number;
  message: string;
  nonce: Uint8Array;
  recipient: string;
  callbackUrl?: string;

  constructor(data: SignMessageParams) {
    // The tag's value is a hardcoded value as per
    // defined in the NEP [NEP413](https://github.com/near/NEPs/blob/master/neps/nep-0413.md)
    this.tag = 2147484061;
    this.message = data.message;
    this.nonce = data.nonce;
    this.recipient = data.recipient;
    if (data.callbackUrl) {
      this.callbackUrl = data.callbackUrl;
    }
  }
}

export const signaturePayloadSchema: Schema = {
  struct: {
    tag: "u32",
    message: "string",
    nonce: { array: { type: "u8", len: 32 } },
    recipient: "string",
    callbackUrl: { option: "string" },
  },
};

// References:
// https://github.com/near/NEPs/blob/master/neps/nep-0413.md#signature
// https://github.com/gagdiez/near-login/blob/main/server/authenticate/wallet-authenticate.js
// https://github.com/near/wallet-selector/blob/main/packages/core/src/lib/helpers/verify-signature/verify-signature.ts#L12
export const verifySignature = async (
  { message, nonce, recipient, callbackUrl }: SignMessageParams,
  publicKey: string,
  signature: string,
): Promise<boolean> => {
  // Reconstruct the payload using the correct borsh schema
  const payload = new SignaturePayload({
    message,
    nonce,
    recipient,
    callbackUrl,
  });
  const serialized = serialize(signaturePayloadSchema, payload);

  // Hash the payload
  const hashedPayload = Uint8Array.from(sha256.array(serialized));

  // Convert signature to buffer base64
  const realSignature = Buffer.from(signature, "base64");

  // Use the public Key to verify that the private-counterpart signed the message
  const pk = PublicKey.fromString(publicKey);

  // Verify the signature
  return pk.verify(hashedPayload, realSignature);
};

export const verifyFullKeyBelongsToUser = async (
  publicKey: string,
  accountId: string,
  NEAR_RPC: string,
): Promise<boolean> => {
  // Call the public RPC asking for all the users' keys
  let keys = await fetch_all_user_keys(accountId, NEAR_RPC);

  // if there are no keys, then the user could not sign it!
  if (!keys) return false;

  // check all the keys to see if we find the used_key there
  for (const k in keys) {
    if (keys[k].public_key === publicKey) {
      // Ensure the key is full access, meaning the user had to sign
      // the transaction through the wallet
      return keys[k].access_key.permission == "FullAccess";
    }
  }

  return false; // didn't find it
};

async function fetch_all_user_keys(accountId: string, NEAR_RPC: string) {
  const keys = (await fetch(NEAR_RPC, {
    method: "post",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: `{"jsonrpc":"2.0", "method":"query", "params":["access_key/${accountId}", ""], "id":1}`,
  })
    .then((data) => data.json())
    .then((result) => result)) as {
    result?: {
      keys?: any[];
    };
  };
  return keys?.result?.keys;
}
