import axios from "axios";
import Cookies from "js-cookie";

export function isSignedInWithServer(accountId: string): boolean {
  try {
    const clientCookie = Cookies.get("super_client_cookie");
    if (!clientCookie) return false;

    const content = JSON.parse(clientCookie);

    if (!content.accountId) return false;
    if (content.accountId.toLowerCase() !== accountId.toLowerCase())
      return false;
    if (new Date(content.expires) <= new Date()) return false;

    return true;
  } catch (_) {
    return false;
  }
}

export interface SignMessageParams {
  message: string;
  recipient: string;
  nonce: string | Buffer;
  callbackUrl?: string;
}

export async function getAuthMessageToSign(
  accountId: string,
): Promise<SignMessageParams> {
  const {
    data: { signParams },
  } = await axios.post(process.env.NEXT_PUBLIC_SUPER_API + "/auth/nonce", {
    accountId: accountId,
  });

  return signParams;
}
