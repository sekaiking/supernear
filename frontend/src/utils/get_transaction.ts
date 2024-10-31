import { getSignedAccountId } from "@/app/providers";
import { FinalExecutionOutcome } from "@near-wallet-selector/core";

export const get_transaction_status = async (
  tx_hash: string,
  sender_account_id: string,
  wait_until?: string,
): Promise<FinalExecutionOutcome | void> => {
  const body = {
    jsonrpc: "2.0",
    id: "dontcare",
    method: "tx",
    params: {
      tx_hash: tx_hash,
      sender_account_id: sender_account_id || getSignedAccountId() || "",
      wait_until: wait_until || "EXECUTED_OPTIMISTIC",
    },
  };
  const res = await fetch(process.env.NEXT_PUBLIC_NEAR_ARCHIVE_RPC!, {
    method: "post",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as GetTransactionResponse;

  if (data.error) {
    throw data.error;
  }
  if (data.result) {
    return data.result;
  }
};

interface GetTransactionResponse {
  id: string;
  jsonrpc: string;
  result: FinalExecutionOutcome;
  error: {
    name: string; // <ERROR_TYPE>
    cause: {
      info: object;
      name: string; // <ERROR_CAUSE>
    };
    code: number;
    data: string;
    message: string;
  };
}
