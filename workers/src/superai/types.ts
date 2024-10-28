export interface Intent {
  action: string;
  description?: string;
  examples: string[];
  parameters: any;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ClassifiedIntent {
  id: number;
  action: string;
  matchId: string;
  confidence: number;
  matches: Array<{
    confidence: number;
    example: string;
  }>;
}

export interface IntentClassifierResponse {
  best: ClassifiedIntent | null;
  alternatives: Array<ClassifiedIntent>;
  error?: {
    message: string;
    status: number;
  };
}
