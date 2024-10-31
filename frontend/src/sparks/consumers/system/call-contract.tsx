import React, { FormEvent, useState } from "react";

import {
  SparkConsumer,
  SparkConsumerMessage,
  SparkConsumerUpdateMessage,
} from "@/types";
import { Button, Form, FormActions, FormItem, Input } from "@chatui/core";
import { calcDecimals, NearToken } from "@/utils/tokens";
import { useWalletSelector } from "@/hooks/useWalletSelector";
import toast from "react-hot-toast";
import { useMessageParameter } from "@/hooks/useMessageParameter";
import { createTransactionManager } from "@/hooks/createTransactionManager";
import { spark_tx_handlers } from "@/utils/spark_tx_handlers";
import Icon from "@/components/common/icon";

export const callContractCosumer: SparkConsumer = {
  id: "call_contract",
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

function UI({
  msg,
  update,
}: {
  msg: SparkConsumerMessage;
  update: SparkConsumerUpdateMessage;
}) {
  const [contract, setContract] = useMessageParameter(
    msg,
    update,
    "contract_id",
  );
  const [method, setMethod] = useMessageParameter(msg, update, "method_name");
  const [args, setArgs] = useMessageParameter<object>(msg, update, "args");
  const [argsStr, setArgsStr] = useState(JSON.stringify(args, null, 2));
  const [attachedAmountStr, setAttachedAmount] = useMessageParameter<
    string | number
  >(msg, update, "deposit");
  const attachedAmount = Number(attachedAmountStr);

  const { selector, accountId, modal } = useWalletSelector();

  const { useTransactionOutcome, signAndSendTransaction } =
    createTransactionManager("call_contract:" + msg._id, accountId);

  const handle = spark_tx_handlers(msg, update);
  useTransactionOutcome(handle.outcome, handle.error);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      toast("Connect your wallet to send transactions");
      modal.show();
      return;
    }
    handle.setExecutingTrue();

    const wallet = await selector.wallet();
    signAndSendTransaction(wallet, {
      signerId: accountId,
      receiverId: contract,
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: method,
            args: args || {},
            deposit:
              attachedAmount > 0
                ? calcDecimals(attachedAmount, NearToken.decimals!)
                : "0",
            gas: "300000000000000",
          },
        },
      ],
    })
      .then(handle.outcome)
      .catch(handle.error);
  };

  if (msg.content?.execution.executed) {
    // if (msg.content?.execution.error) {
    //   return <>Something went wrong: {msg.content.execution.error.message}</>;
    // }
    if (msg.content?.execution.status == "success") {
      return (
        <>
          <div className="d-f align-center">
            <Icon
              name="check"
              fontSize={20}
              className="mr-3"
              color="var(--green)"
            />
            Successfully called smart contract &quot;{contract}&quot; method
            &quot;{method}&quot;
          </div>
          <div className="d-f align-center mt-2">
            <Icon name="compass" fontSize={20} className="mr-3" />
            <b className="mr-1">Transaction: </b>
            <a
              href={`https://nearblocks.io/txns/${msg.content.execution.tx_hash}`}
              target="_blank"
            >
              {msg.content?.execution.tx_hash}
            </a>
          </div>
        </>
      );
    }
  }
  if (msg.content?.execution.status == "executing") {
    return (
      <center>
        <Icon name="spinner" className="is-spin" fontSize={60} />
      </center>
    );
  }

  return (
    <Form onSubmit={handleSend}>
      <div className="d-f mb-3">
        <FormItem label="Contract address">
          <Input
            type="text"
            id="contract"
            value={contract}
            onChange={(v) => setContract(v)}
          />
        </FormItem>
        <FormItem label="Method">
          <Input
            type="text"
            id="decimals"
            value={method}
            onChange={(v) => setMethod(v)}
          />
        </FormItem>
        <FormItem label="Near amount">
          <Input
            type="number"
            id="attached_amount"
            value={attachedAmount}
            onChange={(v) => {
              if (Number(v) >= 0) {
                setAttachedAmount(Number(v));
              }
            }}
          />
        </FormItem>
      </div>
      <FormItem label="Arguments">
        <textarea
          id="args"
          className="Input Input--outline"
          placeholder={'{\n"arg1": "value",\n}'}
          value={argsStr}
          onChange={(event) => {
            setArgsStr(event.target.value);
            try {
              setArgs(JSON.parse(event.target.value));
            } catch (_) {}
          }}
          rows={4}
        />
      </FormItem>
      <FormActions>
        <Button type="submit" color="primary">
          Confirm & Send
        </Button>
      </FormActions>
    </Form>
  );
}
