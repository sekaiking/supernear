"use client";
import styles from "./page.module.scss";
import axios from "axios";
import SuperChat from "@/components/super/chat";
import {
  SuperChatProvider,
  useSuperChat,
} from "@/components/super/chat.context";
import { MessageProps, SparkMessageContent } from "@/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import robot_img from "@/assets/images/ai-avatar.png";
import user_img from "@/assets/images/user-avatar.png";
import { log } from "@/utils/log";
import { useWalletSelector } from "@/hooks/useWalletSelector";
import toast from "react-hot-toast";
import useCrossTabState from "@/hooks/useCrossState";

const defaultQuickReplies = [
  {
    name: "My Account Data",
    isHighlight: false,
  },
  {
    name: "Send 0.01 near to hello.near",
    isHighlight: false,
  },
  {
    name: "Call donate on donate.potlock.near",
    value:
      'Call donate on donate.potlock.near with 1 near and arguments: {"bypass_protocol_fee": false,  "message": "",  "recipient_id": "build.sputnik-dao.near"}',
  },
  {
    name: "Split 5 NEAR between hana.near and baka.near",
    isNew: false,
    isHighlight: false,
  },
  {
    name: "Tell me about NEAR blockchain",
  },
];

export default function Home({}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaultQuery = searchParams.get("query");

  const createQueryString = useCallback(
    (name: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null) {
        params.delete(name);
      } else {
        params.set(name, value);
      }

      return params.toString();
    },
    [searchParams],
  );

  return (
    <>
      <div className={styles.bg} />
      <div className={styles.main}>
        <SuperChatProvider initialQuickReplies={defaultQuickReplies}>
          <InnerChat
            defaultQuery={defaultQuery || undefined}
            removeDefaultQuery={() => {
              router.push(pathname + "?" + createQueryString("query", null));
            }}
            setDefaultQuery={(v) => {
              router.push(pathname + "?" + createQueryString("query", v));
            }}
          />
        </SuperChatProvider>
      </div>
    </>
  );
}

function InnerChat({
  defaultQuery,
  removeDefaultQuery,
  setDefaultQuery,
}: {
  defaultQuery?: string;
  removeDefaultQuery?: () => void;
  setDefaultQuery?: (v: string) => void;
}) {
  const { messages } = useSuperChat();
  const { accountId } = useWalletSelector();
  const [waiting, setWaiting] = useCrossTabState("waiting_for_response", false);

  const handleSend = useCallback(
    (type: string, val: string) => {
      if (!accountId) {
        toast.error("Connect first to chat with SuperNear");
        setDefaultQuery?.(val);
        return;
      }
      if (defaultQuery) {
        removeDefaultQuery?.();
      }
      if (type === "text" && val.trim()) {
        messages.append({
          type: "text",
          content: { text: val },
          position: "right",
          user: {
            role: "user",
            avatar: user_img.src,
          },
        });

        const startTime = Date.now();

        const messagesToSend = messages.items
          .slice(-10)
          .filter((m) => ["user", "assistant"].includes(m?.user?.role))
          .map((m) => {
            return {
              role: m.user?.role,
              content: m.content.text || JSON.stringify(m.content),
            };
          });

        const lastAiMessage = messages.items.findLast(
          (m) => m.user?.role == "assistant",
        );
        const params = {
          msgs: messagesToSend,
          isFollowUp:
            lastAiMessage?.content?.result?.missing_parameters || false,
          followUpAction: lastAiMessage?.content?.result?.name || false,
        };

        messagesToSend.push({
          role: "user",
          content: val,
        });

        log("Calling super with ", params);

        setWaiting(true);
        axios
          .post(process.env.NEXT_PUBLIC_SUPER_API + "/ai/super", params, {
            withCredentials: true,
          })
          .then((r) => {
            const responseTime = Date.now() - startTime;
            log(r);

            if (r.data.action == "conversation") {
              messages.append({
                type: "text",
                content: {
                  text: r.data?.response,
                },
                user: {
                  role: "assistant",
                  avatar: robot_img.src,
                },
              });
            } else {
              if (r.data?.response?.response_to_user) {
                messages.append({
                  type: "text",
                  content: {
                    text: r.data?.response?.response_to_user,
                    result: {
                      name: r.data?.action,
                      missing_parameters: r.data?.response?.missing_parameters, // boolean
                    },
                  },
                  user: {
                    role: "assistant",
                    avatar: robot_img.src,
                  },
                });
              }
              if (r.data?.response?.parameters) {
                const newMsg: MessageProps = {
                  _id: 0,
                  type: "spark",
                  content: {
                    result: {
                      parameters: r.data?.response?.parameters,
                      name: r.data?.action,
                    },
                    execution: {
                      executed: false,
                      status: "waiting_confirmation",
                    },
                  } as SparkMessageContent,
                };
                newMsg._id = messages.append(newMsg);
              }
            }

            const msToTime = (s: number) => {
              const ms = s % 1000;
              s = (s - ms) / 1000;
              const secs = s % 60;
              s = (s - secs) / 60;
              const mins = s % 60;
              const hrs = (s - mins) / 60;

              return hrs + ":" + mins + ":" + secs + "." + ms;
            };

            messages.append({
              type: "debug",
              content: {
                text:
                  `Response time: ${msToTime(responseTime)}\n\n` +
                  JSON.stringify(r.data, null, 2),
              },
            });
          })
          .catch((e) => {
            console.error(e);
            toast.error(
              e?.response?.data?.message ||
                e?.message ||
                "Something went wrong, check console for details",
            );
          })
          .finally(() => {
            setWaiting(false);
          });
      }
    },
    [
      accountId,
      defaultQuery,
      setDefaultQuery,
      removeDefaultQuery,
      messages,
      setWaiting,
    ],
  );

  useEffect(() => {
    if (waiting) {
      messages.append({
        _id: "loading",
        type: "loading",
      });
      return () => messages.delete("loading");
    }
    messages.delete("loading");
  }, [waiting]);

  useEffect(() => {
    if (defaultQuery && accountId) {
      const id = setTimeout(() => {
        handleSend("text", defaultQuery);
      }, 300);
      return () => clearTimeout(id);
    }
  }, [defaultQuery, accountId]);

  return <SuperChat handleSend={handleSend} />;
}
