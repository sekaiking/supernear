import React, { FormEvent, useCallback, useMemo, useState } from "react";

import {
  SparkConsumer,
  SparkConsumerMessage,
  SparkConsumerUpdateMessage,
  TokenType,
} from "@/types";
import Big from "big.js";
import toast from "react-hot-toast";
import { useWalletSelector } from "@/hooks/useWalletSelector";
import { Button, Form, FormActions, FormItem, Input } from "@chatui/core";
import TokenInput from "@/components/near/token-input";
import {
  FinalExecutionOutcome,
  FunctionCallAction,
  TransferAction,
} from "@near-wallet-selector/core";
import { log } from "@/utils/log";
import { createTransactionManager } from "@/hooks/createTransactionManager";
import Icon from "@/components/common/icon";
import { useMessageParameter } from "@/hooks/useMessageParameter";

export const sendTokenConsumer: SparkConsumer = {
  id: "send_token",
  render: (msg, update) => {
    const p = msg.content!.result.parameters as any;
    if (Array.isArray(p) && p.length > 1) {
      const recipients = p
        .map((v) => {
          return `${v?.receiver}, ${v?.amount}`;
        })
        .join("\n");
      return (
        <BulkUI
          key={`${p[0]?.token_or_address}-${recipients}`}
          token_or_address={p[0]?.token_or_address}
          defaultRecipients={recipients}
        />
      );
    }
    if (Array.isArray(p)) {
      const newMsg = { ...msg };
      newMsg.content!.result.parameters = p[0];
      update({
        ...newMsg,
      });
    }
    return <SingleUI key={JSON.stringify(msg._id)} msg={msg} update={update} />;
  },
};

function SingleUI({
  msg,
  update,
}: {
  msg: SparkConsumerMessage;
  update: SparkConsumerUpdateMessage;
}) {
  const [amount, setAmount] = useMessageParameter(msg, update, "amount");
  const [address, setAddress] = useMessageParameter(msg, update, "receiver");
  const [token_or_address, setTokenOrAddress] = useMessageParameter(
    msg,
    update,
    "token_or_address",
  );

  const { selector, accountId, modal } = useWalletSelector();
  const [decimals, setDecimals] = useState<number | undefined>();
  const [token, setToken] = useState<TokenType | null>();

  const { useTransactionOutcome, signAndSendTransaction } =
    createTransactionManager("send_token" + msg._id, accountId);

  const handleOutcome = useCallback(
    (outcome: void | FinalExecutionOutcome) => {
      if (outcome) {
        toast.success(
          "Transaction successful: " + outcome?.final_execution_status,
        );
        const newMsg = { ...msg };
        newMsg.content!.execution.executed = true;
        newMsg.content!.execution.status = "success";
        newMsg.content!.execution.error = undefined;
        newMsg.content!.execution.tx_hash = outcome?.transaction?.hash;
        update({
          ...newMsg,
        });
      }
    },
    [msg, update],
  );

  const handleError = useCallback(
    (error: any) => {
      toast.error(
        "Transaction failed: \n" + error.message ||
          JSON.stringify(error, null, 2),
      );
      log("Transaction failed", error);

      const newMsg = { ...msg };
      newMsg.content!.execution.executed = true;
      newMsg.content!.execution.status = "error";
      newMsg.content!.execution.error = {
        message: error.message,
        code: error.name,
      };
      newMsg.content!.execution.tx_hash = error.transaction?.hash;
      update({
        ...newMsg,
      });
    },
    [msg, update],
  );

  useTransactionOutcome(handleOutcome, handleError);

  const isNear = useMemo(() => {
    return (
      token?.address.toLowerCase() == "near" ||
      token?.symbol?.toLowerCase() == "near"
    );
  }, [token?.address, token?.symbol]);

  const isToken = useMemo(() => {
    return !isNear && !!token?.address;
  }, [isNear, token?.address]);

  const handleRegister = useCallback(async () => {
    log("transfer-tokens => handleRegister");
    if (!accountId) {
      toast("Connect your wallet to send transactions");
      modal.show();
      return;
    }
    const wallet = await selector.wallet();
    if (isNear) {
    } else if (isToken) {
      wallet
        .signAndSendTransaction({
          signerId: accountId,
          receiverId: token!.address,
          actions: [
            {
              type: "FunctionCall",
              params: {
                methodName: "storage_deposit",
                args: {
                  account_id: address,
                },
                deposit: Big(0.01).mul(Big(10).pow(24)).toFixed(),
                gas: "300000000000000",
              },
            },
          ],
        })
        .then(handleOutcome)
        .catch(handleError);
    } else {
      toast.error("Can't send because of invalid token address");
    }
  }, [
    accountId,
    address,
    handleError,
    handleOutcome,
    isNear,
    isToken,
    modal,
    selector,
    token,
  ]);

  const handleSend = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      log("transfer-tokens => handleSend");
      if (!accountId) {
        toast("Connect your wallet to send transactions");
        modal.show();
        return;
      }
      const newMsg = { ...msg };
      newMsg.content!.execution.executed = false;
      newMsg.content!.execution.status = "executing";
      newMsg.content!.execution.error = undefined;
      update({
        ...newMsg,
      });
      const wallet = await selector.wallet();
      if (isNear) {
        signAndSendTransaction(wallet, {
          signerId: accountId,
          receiverId: address,
          actions: [
            {
              type: "Transfer",
              params: {
                deposit: Big(amount)
                  .mul(Big(10).pow(decimals || 1))
                  .toFixed(),
              },
            },
          ],
        })
          .then(handleOutcome)
          .catch(handleError);
      } else if (isToken) {
        signAndSendTransaction(wallet, {
          signerId: accountId,
          receiverId: token!.address,
          actions: [
            {
              type: "FunctionCall",
              params: {
                methodName: "ft_transfer",
                args: {
                  amount: Big(amount)
                    .mul(Big(10).pow(decimals || 1))
                    .toFixed(),
                  receiver_id: address,
                },
                deposit: "1",
                gas: "300000000000000",
              },
            },
          ],
        })
          .then(handleOutcome)
          .catch(handleError);
      } else {
        toast.error("Can't send because of invalid token address");
      }
    },
    [
      accountId,
      msg,
      update,
      selector,
      isNear,
      isToken,
      modal,
      signAndSendTransaction,
      address,
      amount,
      decimals,
      handleOutcome,
      handleError,
      token,
    ],
  );

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
            Sent {amount} {token_or_address} to {address}
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
        <FormItem label="Amount">
          <Input
            type="number"
            id="amount"
            value={amount}
            onChange={(v) => setAmount(v)}
          />
        </FormItem>
        <FormItem label="Decimals">
          <Input
            type="number"
            id="decimals"
            value={decimals ?? token?.decimals ?? ""}
            onChange={(v) => {
              if (Number(v) >= 0) {
                setDecimals(Number(v));
              }
            }}
          />
        </FormItem>
        <FormItem label="Token">
          <TokenInput
            findToken={token_or_address}
            token={token}
            setToken={(t) => {
              if (t?.decimals) {
                setDecimals(t.decimals);
              }
              setToken(t);
              setTokenOrAddress(t?.address || t?.symbol || "");
            }}
          />
        </FormItem>
      </div>
      <FormItem label="Receiver">
        <Input
          type="text"
          id="address"
          value={address}
          onChange={(v) => setAddress(v)}
        />
      </FormItem>
      <FormActions>
        <Button color="primary" type="submit">
          Send
        </Button>
      </FormActions>
      {isToken && msg.content?.execution.status == "error" && (
        <FormItem>
          <p>
            Getting Account not registered error?
            <Button className="ml-2" variant="text" onClick={handleRegister}>
              Click Here to fix it
            </Button>
          </p>
        </FormItem>
      )}
    </Form>
  );
}

function BulkUI({
  token_or_address,
  defaultRecipients,
}: {
  token_or_address: string;
  defaultRecipients: string;
}) {
  const { selector, accountId, modal } = useWalletSelector();
  const [decimals, setDecimals] = useState<number | undefined>();
  const [token, setToken] = useState<TokenType | null>();
  const [recipients, setRecipients] = useState<string>(defaultRecipients);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    log("transfer-bulk-tokens => handleSend");

    if (!accountId) {
      toast("Connect your wallet to send transactions");
      modal.show();
      return;
    }

    const wallet = await selector.wallet();

    try {
      if (
        token?.address.toLowerCase() == "near" ||
        token?.symbol?.toLowerCase() == "near"
      ) {
        const txs = recipients.split("\n").map((v) => {
          const parts = v.split(",");
          const action: TransferAction = {
            type: "Transfer",
            params: {
              deposit: Big(parts[1].trim())
                .mul(Big(10).pow(decimals || 1))
                .toFixed(),
            },
          };
          return {
            signerId: accountId,
            receiverId: parts[0].trim(),
            actions: [action],
          };
        });

        await wallet.signAndSendTransactions({
          transactions: txs,
        });
      } else if (token?.address) {
        const actions: FunctionCallAction[] = recipients
          .split("\n")
          .map((v) => {
            const parts = v.split(",");
            return {
              type: "FunctionCall",
              params: {
                methodName: "ft_transfer",
                args: {
                  amount: Big(parts[1].trim())
                    .mul(Big(10).pow(decimals || 1))
                    .toFixed(),
                  receiver_id: parts[0].trim(),
                },
                deposit: "1",
                gas: "300000000000000",
              },
            };
          });

        await wallet.signAndSendTransaction({
          signerId: accountId,
          receiverId: token.address,
          actions: actions,
        });
      } else {
        toast.error("Can't send because of invalid token address");
      }
    } catch (e: any) {
      toast.error(
        e.message ||
          "Something went wrong, couldn't sign and send transaction.",
      );
    }
  };

  return (
    <Form onSubmit={handleSend}>
      <div className="d-f mb-3">
        <FormItem label="Decimals">
          <Input
            type="number"
            id="decimals"
            value={decimals ?? token?.decimals ?? ""}
            onChange={(v) => {
              if (Number(v) >= 0) {
                setDecimals(Number(v));
              }
            }}
          />
        </FormItem>
        <FormItem label="Token">
          <TokenInput
            findToken={token_or_address}
            token={token}
            setToken={(t) => {
              if (t?.decimals) {
                setDecimals(t.decimals);
              }
              setToken(t);
            }}
          />
        </FormItem>
      </div>
      <FormItem label="Address, Amount">
        <textarea
          id="recipients"
          className="Input Input--outline"
          placeholder={
            "example1.near, 1\nexample2.near, 0.1\nexample3.near, 20"
          }
          value={recipients}
          onChange={(event) => setRecipients(event.target.value)}
          rows={4}
        />
      </FormItem>
      <FormActions>
        <Button color="primary" type="submit">
          Send
        </Button>
      </FormActions>
    </Form>
  );
}
