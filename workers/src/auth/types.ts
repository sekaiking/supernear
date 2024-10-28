export interface SignMessageParams {
  message: string;
  recipient: string;
  nonce: Buffer;
  callbackUrl?: string;
}

export type SignMessageParamsWithEncodedNonce = Omit<
  SignMessageParams,
  "nonce"
> & {
  nonce: string;
};
