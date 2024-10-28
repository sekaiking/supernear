import useCrossTabState from "@/hooks/useCrossState";
import useMessages from "@/hooks/useMessages";
import { QuickReplyItemProps, useQuickReplies } from "@chatui/core";
import { MessageId, MessageProps } from "@chatui/core/lib/components/Message";
import {
  createContext,
  ReactNode,
  useContext,
  useState,
  SetStateAction,
  Dispatch,
} from "react";

export type MessageWithoutId = Omit<MessageProps, "_id"> & {
  _id?: MessageId;
};

export interface Settings {
  dangerousMode?: boolean;
  showDebug?: boolean;
  [key: string]: any;
}

interface SuperChatContextType {
  messages: {
    items: MessageProps[];
    prepend: (msgs: MessageProps[]) => void;
    append: (msg: MessageWithoutId) => MessageId;
    update: (id: MessageId, msg: MessageWithoutId) => void;
    delete: (id: MessageId) => void;
    resetList: (list?: any) => void;
  };
  settings: {
    get: (key: keyof Settings) => any | undefined;
    set: (key: keyof Settings, value: any) => any | undefined;
    getAll: Settings;
    setAll: Dispatch<SetStateAction<Settings>>;
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
  };
  quickReplies: ReturnType<typeof useQuickReplies>;
}

const SuperChatContext = createContext<SuperChatContextType | undefined>(
  undefined,
);

export function useSuperChat() {
  const context = useContext(SuperChatContext);
  if (context === undefined) {
    throw new Error("useSuperChat must be used within a SuperChatProvider");
  }
  return context;
}

interface SuperChatProviderProps {
  children: ReactNode;
  initialMessages?: MessageWithoutId[];
  initialSettings?: Settings;
  initialQuickReplies?: QuickReplyItemProps[];
  initialOpenSettingsModal?: boolean;
}

export function SuperChatProvider({
  children,
  initialMessages,
  initialSettings,
  initialQuickReplies,
  initialOpenSettingsModal,
}: SuperChatProviderProps) {
  const msgs = useMessages(initialMessages);
  const [openSettingsModal, setOpenSettingsModal] = useState<boolean>(
    initialOpenSettingsModal || false,
  );
  const [settings, setSettings] = useCrossTabState<Settings>(
    "superchat_settings",
    initialSettings || {
      dangerousMode: false,
      showDebug: false,
    },
  );
  const quickReplies = useQuickReplies(initialQuickReplies);

  return (
    <SuperChatContext.Provider
      value={{
        messages: msgs,
        settings: {
          get: (k) => settings[k],
          set: (k, v) => {
            setSettings((prevState) => ({
              ...prevState,
              [k]: v,
            }));
          },
          getAll: settings,
          setAll: setSettings,
          isOpen: openSettingsModal,
          open: () => setOpenSettingsModal(true),
          close: () => setOpenSettingsModal(false),
          toggle: () => setOpenSettingsModal((b) => !b),
        },
        quickReplies,
      }}
    >
      {children}
    </SuperChatContext.Provider>
  );
}
