import React, { useEffect, useRef, useState } from "react";
import Chat, {
  Bubble,
  Button,
  Form,
  FormActions,
  FormItem,
  Input,
  MessageProps,
  Modal,
  QuickReplyItemProps,
  ToolbarItemProps,
} from "@chatui/core";
import Markdown from "react-markdown";
import { Spark } from "@/sparks/Spark";
import { useSuperChat } from "./chat.context";
import toast from "react-hot-toast";
import Icon from "../common/icon";

export default function SuperChat({
  handleSend,
  defaultInputValue,
}: {
  handleSend: (type: string, val: string) => void;
  defaultInputValue?: string;
}) {
  const { messages, settings, quickReplies } = useSuperChat();
  const [formErrors, setFormErrors] = useState({ dangerousMode: "" });
  const composerRef = useRef(null);
  const messagesRef = useRef<any>(null);
  const [scrollDown, setScrollDown] = useState(false);

  function handleQuickReplyClick(item: QuickReplyItemProps) {
    handleSend("text", item.name);
  }

  const handleSaveSettings: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    setFormErrors({ dangerousMode: "" });
    const form = new FormData(e.currentTarget);
    const dm = form.get("dangerousMode")?.toString().toLowerCase().trim();
    if (dm?.length && dm != "true") {
      setFormErrors((prevState) => ({
        ...prevState,
        dangerousMode: "Set to 'true' to enable or empty to disable",
      }));
      return;
    }

    settings.set("showDebug", form.get("showDebug")?.toString() === "true");
    settings.set(
      "dangerousMode",
      form.get("dangerousMode")?.toString().toLowerCase().trim() === "true",
    );

    settings.close();
    toast.success("Settings Saved!");
  };

  function handleToolbarClick(item: ToolbarItemProps) {
    if (item.type === "reset_conversation") {
      messages.resetList();
    }
  }

  useEffect(() => {
    if (composerRef.current) {
      const input = composerRef.current as any;
      input.setText(defaultInputValue);
    }
  }, [composerRef, defaultInputValue]);

  useEffect(() => {
    if (scrollDown) return;
    if (messagesRef && messagesRef.current) {
      messagesRef.current.scrollToEnd({ animated: true, force: true });
      setScrollDown(true);
    }
  }, [scrollDown, messagesRef]);

  return (
    <>
      <Chat
        navbar={{
          title: "Supernear",
          rightContent: [
            {
              icon: "settings",
              title: "Applications",
              onClick: settings.open,
            },
          ],
        }}
        messages={messages.items}
        renderMessageContent={renderMessageContent}
        quickReplies={quickReplies.quickReplies}
        onQuickReplyClick={handleQuickReplyClick}
        onSend={handleSend}
        locale="en-US"
        placeholder="Send a message"
        toolbar={[
          {
            type: "reset_conversation",
            icon: "refresh",
            title: "Reset Conversation",
          },
        ]}
        wideBreakpoint="100px"
        onToolbarClick={handleToolbarClick}
        inputOptions={{
          value: defaultInputValue,
          autoFocus: true,
        }}
        composerRef={composerRef}
        messagesRef={messagesRef}
      />
      <Modal active={settings.isOpen} title="Settings" onClose={settings.close}>
        <Form onSubmit={handleSaveSettings}>
          <FormItem
            label="Dangerous Mode"
            invalid={!!formErrors["dangerousMode"].length}
            help={
              !!formErrors["dangerousMode"].length
                ? formErrors["dangerousMode"]
                : "Transactions will be signed and sent without asking your permission."
            }
          >
            <Input
              defaultValue={settings.get("dangerousMode") ? "true" : ""}
              name="dangerousMode"
              placeholder="Write 'true' to enable"
            />
          </FormItem>
          <div className="mb-2" />
          <FormItem label="Enable Debug Data">
            <input
              defaultChecked={settings.get("showDebug")}
              type="checkbox"
              value="true"
              name="showDebug"
            />
          </FormItem>
          <FormActions>
            <Button type="submit" color="primary">
              Save
            </Button>
          </FormActions>
        </Form>
      </Modal>
    </>
  );
}

function renderMessageContent(msg: MessageProps) {
  const { type, content, user } = msg;
  const { settings } = useSuperChat();
  const {
    messages: { update },
  } = useSuperChat();

  switch (type) {
    case "text":
      return (
        <div
          className={[
            user?.role == "assistant" ? "assistant" : "",
            "ChatBubble",
          ].join(" ")}
        >
          <Markdown>{content.text}</Markdown>
        </div>
      );
    case "debug":
      if (settings.get("showDebug")) {
        return (
          <div className="ml-1">
            <b>Debug</b>
            <Bubble content={content.text} />
          </div>
        );
      } else {
        return null;
      }
    case "image":
      return (
        <Bubble type="image">
          <img src={content.picUrl} alt="" />
        </Bubble>
      );
    case "spark":
      return <Spark update={update} message={msg} />;
    case "loading":
      return <Icon name="spinner" className="is-spin" fontSize={40} />;
    default:
      return null;
  }
}
