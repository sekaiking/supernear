export const near_view = async (
  smart_contract: string,
  method_name: string,
  args?: any,
) => {
  const body = {
    method: "query",
    params: {
      request_type: "call_function",
      account_id: smart_contract,
      method_name: method_name,
      args_base64: args
        ? Buffer.from(JSON.stringify(args)).toString("base64")
        : undefined,
      finality: "optimistic",
    },
    id: "dontcare",
    jsonrpc: "2.0",
  };
  return fetch(process.env.NEXT_PUBLIC_NEAR_RPC!, {
    method: "post",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  })
    .then((data) => data.json())
    .then((response: any) => {
      if (!response.result.result) {
        return null;
      }
      try {
        return JSON.parse(Buffer.from(response.result.result).toString());
      } catch (e) {
        return Buffer.from(response.result.result).toString();
      }
    });
};
