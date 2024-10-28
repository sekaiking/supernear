import { FinalExecutionOutcome } from "@near-wallet-selector/core";
import toast from "react-hot-toast";
import { log } from "./log";
import { SparkConsumerMessage, SparkConsumerUpdateMessage } from "@/types";

export const handleOutcome = (
  msg: SparkConsumerMessage,
  update: SparkConsumerUpdateMessage,
  outcome: void | FinalExecutionOutcome,
) => {
  if (outcome) {
    toast.success("Transaction successful: " + outcome?.final_execution_status);
    const newMsg = { ...msg };
    newMsg.content!.execution.executed = true;
    newMsg.content!.execution.status = "success";
    newMsg.content!.execution.error = undefined;
    newMsg.content!.execution.tx_hash = outcome?.transaction?.hash;
    update({
      ...newMsg,
    });
  }
};

export const handleError = (
  msg: SparkConsumerMessage,
  update: SparkConsumerUpdateMessage,
  error: any,
) => {
  toast.error(
    "Transaction failed: \n" + error.message || JSON.stringify(error, null, 2),
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
};

export const setExecutingTrue = (
  msg: SparkConsumerMessage,
  update: SparkConsumerUpdateMessage,
) => {
  const newMsg = { ...msg };
  newMsg.content!.execution.executed = false;
  newMsg.content!.execution.status = "executing";
  newMsg.content!.execution.error = undefined;
  update({
    ...newMsg,
  });
};

export const spark_tx_handlers = (
  msg: SparkConsumerMessage,
  update: SparkConsumerUpdateMessage,
) => {
  return {
    error: (error: any) => handleError(msg, update, error),
    outcome: (outcome: void | FinalExecutionOutcome) =>
      handleOutcome(msg, update, outcome),
    setExecutingTrue: () => setExecutingTrue(msg, update),
  };
};
