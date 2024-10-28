import { Context } from "hono";
import { classify_intent, INTENTS } from "./intent_classifier";
import { Intent, IntentClassifierResponse, Message } from "./types";
import { stripIndents } from "common-tags";
import { get_intent_by_action, get_intent_by_id } from "./helpers";
import { createMistral } from "@ai-sdk/mistral";
import { generateText } from "ai";

export const chat_with_super = async (c: Context) => {
  //****
  ////// Parameters Extraction & Validation
  //****
  let messages: Array<Message> = [];
  let options: {
    isFollowUp?: boolean;
    followUpAction?: string | null;
  } = {};
  try {
    const req = await c.req.json();
    messages = req.msgs;
    options.isFollowUp = req.isFollowUp || false;
    options.followUpAction = req.followUpAction;
    if (!messages) throw "Invalid request";
    if (!Array.isArray(messages)) throw "Invalid request";
    if (messages.length < 1) throw "Invalid request";
    if (messages.length > 10) throw "Can't have more than 10 messages";
    if (
      !messages.every(
        (v) =>
          typeof v?.role == "string" &&
          typeof v?.content == "string" &&
          (v?.role === "user" || v?.role == "assistant"),
      )
    )
      throw "Invalid request";
  } catch (e: any) {
    return c.json({ error: e?.message || "Invalid request" }, 400);
  }
  //****
  //////

  if (!options.isFollowUp) {
    //****
    ////// Intent detection
    //****
    const lastMessage = messages[messages.length - 1];
    const classifiedIntent = await classify_intent(c, lastMessage.content);
    if (classifiedIntent.error) {
      return c.json(
        { error: classifiedIntent.error.message || "Something went wrong" },
        (classifiedIntent.error.status as any) || 500,
      );
    }
    console.log("classified intent", JSON.stringify(classifiedIntent));
    //****
    //////
    if (!!classifiedIntent.best) {
      const intent = get_intent_by_id(classifiedIntent.best!.id);
      return extract_entities(
        c,
        messages,
        intent,
        classifiedIntent.best!.confidence,
      );
    } else {
      return continue_conversation(c, messages);
    }
  }

  if (!!options.followUpAction && options.followUpAction !== "conversation") {
    const intent = get_intent_by_action(options.followUpAction);
    return extract_entities(c, messages, intent);
  } else {
    return continue_conversation(c, messages);
  }
};

const continue_conversation = async (c: Context, messages: Array<Message>) => {
  const mistral = createMistral({
    apiKey: c.env.MISTRAL_API_KEY,
  });

  const intents = INTENTS.map((v) => v.action);

  const SYSTEM_TEMPLATE = stripIndents`
ROLE: SuperNear Assistant
CAPABILITIES: NEAR blockchain expert and action executor

CORE FUNCTIONS:
1. Answer questions about NEAR ecosystem
2. Execute blockchain actions when explicitly requested
3. Provide helpful information about NEAR
4. Engage in natural conversation about blockchain topics

AVAILABLE ACTIONS:
${intents.map((intent) => `- ${intent}`).join("\n")}

RESPONSE RULES:
1. IF user explicitly requests an action:
   - RETURN only the action name
   - NO additional text or explanation
   
2. IF user asks general questions or the action doesn't exist:
   - Respond naturally and informatively
   - Focus on NEAR ecosystem knowledge
   - Be concise but complete
   - Use clear, technical language
   
3. WHEN detecting actions:
   - Match user intent exactly
   - Don't assume or interpret actions
   - Only trigger actions on explicit requests

4. MAINTAIN conversation context:
   - Reference previous messages when relevant
   - Stay focused on current topic
   - Don't repeat information unnecessarily

EXAMPLES:
User: "send 100 NEAR to bob.near"
Response: "send_token"

User: "What is NEAR Protocol?"
Response: [Natural detailed explanation]

User: "Can you explain staking?"
Response: [Natural detailed explanation]
`;

  const { text, usage } = await generateText({
    model: mistral("ministral-8b-latest", {}),
    messages: [
      {
        role: "system",
        content: SYSTEM_TEMPLATE,
      },
      ...messages,
    ],
  });

  // Check if response is a direct action command
  if (text.length < 100) {
    const intent = INTENTS.find((v) => v.action === text.trim());
    if (intent) {
      return extract_entities(c, messages, intent);
    }
  }

  return c.json({
    action: "conversation",
    response: text,
    usage,
  });
};

const extract_entities = async (
  c: Context,
  messages: Array<Message>,
  intent: Intent,
  confidence?: number,
): Promise<any> => {
  const SYSTEM_TEMPLATE = stripIndents`
ROLE: Parameter Extraction Agent
GOAL: Extract parameters for NEAR blockchain actions  
OUTPUT: JSON object only, no explanations or natural language

RULES:
- Focus only on the last user message.
- Extract parameters defined in the schema only.
- Use prior context only when essential.
- Validate all extracted parameters against the schema.
- Do not add explanations, suggestions, or undefined fields.
- Output JSON in the specified format only.

RESPONSE OPTIONS:
1. Wrong Intent:   { "wrong_intent": true, "response_to_user": "{specific_question}" }
2. Missing Params: { "missing_parameters": true, "response_to_user": "{specific_question}" }
3. Complete:       { "parameters": {...}, "response_to_user": "{action_description}" }


### Example 1
User: "send 100 NEAR to bob.near"
Response: {
  "parameters": [{
    "token_or_address": "NEAR",
    "amount": 100,
    "receiver": "bob.near"
  }],
  "response_to_user": "Sending tokens..."
}

### Example 2
User: "send NEAR to bob"
Response: {
  "missing_parameters": true,
  "response_to_user": "Please specify the amount to send"
}

### Example 3
User: "what's the weather like?"
Response: {
  "wrong_intent": true,
  "response_to_user": "I can't help you with that"
}
`;

  const MESSAGE_TEMPLATE = `
CURRENT TASK:
- Intent: ${intent.action}
- Confidence: ${confidence || "N/A"}

PARAMETERS SCHEMA:
\`\`\`typescript
${Array.isArray(intent.parameters) ? intent.parameters.join("\n") : JSON.stringify(intent.parameters, null, 2)}
\`\`\`

CONVERSATION HISTORY:
${messages.map((m) => `[${m.role.toUpperCase()}]: ${m.content}`).join("\n")}

EXTRACTION TASK:
1. Check if last message matches intent "${intent.action}".
2. Extract parameters based on the last message content, and if needed from previous messages.
3. Validate against schema.
4. Return appropriate JSON response.
`;

  const mistral = createMistral({
    apiKey: c.env.MISTRAL_API_KEY,
  });
  console.log(SYSTEM_TEMPLATE + "\n" + MESSAGE_TEMPLATE);

  const { text, usage } = await generateText({
    // model: mistral("ministral-8b-latest", {}),
    // model: mistral("mistral-large-latest", {}),
    // model: mistral("ministral-3b-latest", {}),
    model: mistral("open-mistral-nemo", {}),
    prompt: SYSTEM_TEMPLATE + "\n" + MESSAGE_TEMPLATE,
  });

  const response = parseAiJsonResponse(text);
  if (response?.wrong_intent) {
    return continue_conversation(c, messages);
  }

  return c.json({
    confidence: confidence,
    action: intent.action,
    response: response,
    usage,
  });
};

const parseAiJsonResponse = (input: string): Record<any, any> => {
  try {
    return JSON.parse(input);
  } catch (e) {}

  const pattern = /```json(.*?)```/gs;

  // Process each match, attempting to parse it as JSON
  try {
    const matches = input.match(pattern);
    const r =
      matches?.map((match) => {
        const jsonStr = match.replace(/```json|```/g, "").trim();
        return JSON.parse(jsonStr);
      }) ?? [];
    if (r.length == 1) {
      return r[0];
    } else {
      return r;
    }
  } catch (error) {
    console.error(`Failed to parse: ${input}`);
  }

  return {};
};
