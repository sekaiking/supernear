import { SparkConsumerMessage, SparkConsumerUpdateMessage } from "@/types";
import { useCallback } from "react";

export function useMessageParameter<T = string>(
  msg: SparkConsumerMessage,
  update: SparkConsumerUpdateMessage,
  name: string,
): [T, (value: T) => void] {
  const params = msg.content!.result.parameters;

  return [
    params[name] as T,
    useCallback(
      (newvalue: T) => {
        const newMsg = { ...msg };
        newMsg.content!.result.parameters[name] = newvalue;
        update({
          ...newMsg,
        });
      },
      [msg, update, name],
    ),
  ];
}
