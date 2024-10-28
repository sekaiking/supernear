import { MessageId } from "@chatui/core/lib/components/Message";
import { User } from "@chatui/core/lib/components/Message/Message";
import { IMessageStatus } from "@chatui/core/lib/components/MessageStatus";

export type NetworkId = ProductionNetwork["networkId"];
export type Network = ProductionNetwork;

type ProductionNetwork = {
  networkId: "testnet" | "mainnet";
  viewAccountId: string;
  nodeUrl: string;
  walletUrl: string;
  helperUrl: string;
};

export type JsonSchema = Record<string, unknown>;

export type SparkConsumerUpdateMessage = (
  msg: MessageProps<SparkMessageContent>,
) => void;
export type SparkConsumerMessage = MessageProps<SparkMessageContent>;

export interface SparkConsumer {
  id: string;
  render?: (
    msg: SparkConsumerMessage,
    update: SparkConsumerUpdateMessage,
  ) => React.ReactNode;
}

export interface SparkDefinition {
  id: string;
  type: "bos" | "system";
  widget?: string; // required only if type == "bos"
  description: string;
  examples: string[];
  parametersSchema: JsonSchema;
  defaultParameters?: Record<string, unknown>;
}

export interface SparkResult {
  name: string;
  parameters: any;
  // relevant_text?: string;
  // extraction_notes?: string;
  // confidence?: number;
  // explanation?: string;
}

export interface SparkMessageContent {
  result: SparkResult;
  execution: {
    tx_hash?: string;
    status: "waiting_confirmation" | "executing" | "success" | "error";
    executed?: boolean;
    error?: {
      code: "userRejected" | string;
      message?: string;
    };
  };
}

export type TokenType = {
  address: string;
  symbol?: string;
  icon?: string;
  decimals?: number;
  coinGeckoId?: string;
  price?: number;
  balance?: number;
};

export type TokenTypeMin = [
  contract: string,
  symbol: string,
  decimals: number,
  name: string,
  reference: string,
  total_supply: number,
];

export interface MessageProps<T = any> {
  _id: MessageId;
  type: string;
  content?: T;
  createdAt?: number;
  user?: User;
  position?: "left" | "right" | "center" | "pop";
  hasTime?: boolean;
  status?: IMessageStatus;
  renderMessageContent?: (message: MessageProps) => React.ReactNode;
}

export type Messages = MessageProps[];

export type MessageWithoutId = Omit<MessageProps, "_id"> & {
  _id?: MessageId;
};
