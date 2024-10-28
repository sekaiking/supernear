import React, { useEffect, useState } from "react";

import {
  SparkConsumer,
  SparkConsumerMessage,
  SparkConsumerUpdateMessage,
} from "@/types";
import { useMessageParameter } from "@/hooks/useMessageParameter";
import { AccountRPCResult, get_account } from "@/utils/get_account";
import toast from "react-hot-toast";
import { calcDecimals, uncalcDecimals } from "@/utils/tokens";

export const useExplorerConsumer: SparkConsumer = {
  id: "use_explorer",
  render: (msg, update) => {
    const p = msg.content!.result.parameters;
    if (Array.isArray(p)) {
      const newMsg = { ...msg };
      newMsg.content!.result.parameters = p[0];
      update({
        ...newMsg,
      });
    }
    return <UI key={JSON.stringify(msg._id)} msg={msg} update={update} />;
  },
};

type Parameters = {
  query: string | "self";
  filters?: {
    date_range?: {
      start: string;
      end: string;
    };
    limit?: number;
  };
}[];

const TX_HASH_REGEX = /^[A-Za-z0-9]{43,44}$/;
const BLOCK_ID_REGEX = /^\d+$/;
const ACCOUNT_ID_REGEX = /^[a-z0-9_-]+\.(testnet|near)$/;

function UI({
  msg,
  update,
}: {
  msg: SparkConsumerMessage;
  update: SparkConsumerUpdateMessage;
}) {
  const [query, setQuery] = useMessageParameter<string>(msg, update, "query");
  const [filters, setFilters] = useMessageParameter<any>(
    msg,
    update,
    "filters",
  );

  if (query === "self") {
  }
  if (ACCOUNT_ID_REGEX.test(query)) {
    return <AccountExplorer accountId={query} />;
  }
  if (TX_HASH_REGEX.test(query)) {
  }
  if (BLOCK_ID_REGEX.test(query)) {
  }

  return <div>Can&apos;t parse your query: {query}</div>;
}

function AccountExplorer({ accountId }: { accountId: string }) {
  const [data, setData] = useState<AccountRPCResult | void | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!accountId) return;
    get_account(accountId)
      .then(setData)
      .catch((e) => toast.error(e.message));
  }, [accountId]);

  if (typeof data === "undefined") {
    return <>fetching...</>;
  }

  if (!data) {
    return <center>Account not found</center>;
  }

  return (
    <div>
      <ul>
        <li>
          <b>Account: </b> {accountId}
        </li>
        <li>
          <b>Balance: </b> {uncalcDecimals(data.amount, 24).toFixed(4)} NEAR
        </li>
        <li>
          <b>Storage Used: </b> {(data.storage_usage / 1000).toFixed(2)} B
        </li>
      </ul>
    </div>
  );
}
