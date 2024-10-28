export const get_account = async (
  account_id: string,
): Promise<AccountRPCResult | void> => {
  const body = {
    jsonrpc: "2.0",
    id: "dontcare",
    method: "query",
    params: {
      account_id: account_id,
      finality: "optimistic",
      request_type: "view_account",
    },
  };
  const res = await fetch(process.env.NEXT_PUBLIC_NEAR_ARCHIVE_RPC!, {
    method: "post",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as GetAccountResponse;

  if (data.error) {
    throw data.error;
  }
  if (data.result) {
    return data.result;
  }
};

export interface AccountRPCResult {
  amount: string;
  locked: string;
  code_hash: string;
  storage_usage: number;
  storage_paid_at: number;
  block_height: number;
  block_hash: string;
}

export interface GetAccountResponse {
  id: string;
  jsonrpc: string;
  result: AccountRPCResult;
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
