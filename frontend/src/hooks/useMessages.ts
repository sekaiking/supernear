import { MessageId } from "@chatui/core/lib/components/Message";
import { useMemo, useCallback } from "react";
import useCrossTabState from "./useCrossState";
import type { Messages, MessageWithoutId } from "@/types";

const TIME_GAP = 5 * 60 * 1000;
let lastTs = 0;

const makeMsg = (msg: MessageWithoutId, id?: MessageId) => {
  const ts = msg.createdAt || Date.now();
  const hasTime = msg.hasTime || ts - lastTs > TIME_GAP;

  if (hasTime) {
    lastTs = ts;
  }

  return {
    ...msg,
    _id: msg._id || id || getRandomString(),
    createdAt: ts,
    position: msg.position || "left",
    hasTime,
  };
};

function getRandomString() {
  const x = 2147483648;
  return (
    Math.floor(Math.random() * x).toString(36) +
    // eslint-disable-next-line no-bitwise
    Math.abs(Math.floor(Math.random() * x) ^ Date.now()).toString(36)
  );
}

// TODO: only keep last 20 messages
export default function useMessages(initialState: MessageWithoutId[] = []) {
  const initialMsgs: Messages = useMemo(
    () => initialState.map((t) => makeMsg(t)),
    [initialState],
  );
  const [messages, setMessages] = useCrossTabState("messages", initialMsgs);

  const prepend = useCallback((msgs: Messages) => {
    setMessages((prev: Messages) => [...msgs, ...prev]);
  }, []);

  const update = useCallback((id: MessageId, msg: MessageWithoutId) => {
    setMessages((prev) =>
      prev.map((t) => (t._id === id ? makeMsg(msg, id) : t)),
    );
  }, []);

  const append = useCallback((msg: MessageWithoutId) => {
    const newMsg = makeMsg(msg);
    setMessages((prev) => [...prev, newMsg]);
    return newMsg._id;
  }, []);

  const deleteMsg = useCallback((id: MessageId) => {
    setMessages((prev) => prev.filter((t) => t._id !== id));
  }, []);

  const resetList = useCallback((list = []) => {
    setMessages(list);
  }, []);

  return {
    items: messages,
    prepend,
    append,
    update,
    delete: deleteMsg,
    resetList,
  };
}
