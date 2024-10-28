import { Context } from "hono";
import INTENTS from "../../data/intents.2.json";
import { ClassifiedIntent, IntentClassifierResponse } from "./types";
import { SuperContext } from "..";

const THRESHOLD_CONFIDENCE = 0.74;

export { INTENTS };

// Endpoint to train/initialize the intent classifier
export const train_intent_classifier = async (c: Context) => {
  const user = c.get("user");
  if (!["boroboro.testnet"].includes(user.accountId)) {
    return c.json(
      {
        error: "Not allowed",
      },
      401,
    );
  }

  try {
    // Generate embeddings for all intent examples
    await Promise.all(
      INTENTS.map(async (intent, id) => {
        const { data } = await c.env.AI.run(
          "@cf/baai/bge-base-en-v1.5",
          {
            text: intent.examples,
          },
          {
            gateway: {
              id: "super",
              skipCache: true,
              cacheTtl: 3360,
            },
          },
        );
        // Store embeddings in vector index
        const vectors = data.map((embedding: number[], index: number) => ({
          id: `${id}@${index}`,
          values: embedding,
        }));

        await c.env.VECTOR_INDEX.upsert(vectors);
      }),
    );

    return c.json({
      success: true,
      message: "Intent classifier trained successfully",
    });
  } catch (error) {
    console.error("Training error:", error);
    return c.json(
      { success: false, error: "Failed to train intent classifier" },
      500,
    );
  }
};

export const classify_intent = async (
  c: SuperContext,
  text: string,
): Promise<IntentClassifierResponse> => {
  try {
    if (!text) {
      return {
        best: null,
        alternatives: [],
        error: { message: "Text is required", status: 400 },
      };
    }

    // Generate embedding for user input
    const embeddings = await c.env.AI.run(
      "@cf/baai/bge-base-en-v1.5",
      {
        text: [text],
      },
      {
        gateway: {
          id: "super",
          skipCache: true,
          cacheTtl: 60,
        },
      },
    );
    const userInputVector = embeddings.data[0];

    // Find most similar intents
    const vectorQuery = await c.env.VECTOR_INDEX.query(userInputVector, {
      topK: 2,
    });

    if (!vectorQuery.matches || vectorQuery.matches.length === 0) {
      return {
        best: null,
        alternatives: [],
      };
    }

    // Process matches to get unique intents with confidence scores
    const intentMatches: Record<string, ClassifiedIntent> =
      vectorQuery.matches.reduce(
        // @ts-ignore
        (acc: Record<string, ClassifiedIntent>, match: any) => {
          const intent = INTENTS[match.id.split("@")[0]];

          if (!intent) {
            return acc;
          }

          if (match.score < THRESHOLD_CONFIDENCE) {
            return acc;
          }

          if (!acc[intent.action]) {
            acc[intent.action] = {
              id: match.id.split("@")[0],
              action: intent.action,
              matchId: match.id,
              confidence: match.score,
              matches: [],
            };
          }

          const example = intent.examples[match.id.split("@")[1]];
          acc[intent.action].matches.push({
            example: example,
            confidence: match.score,
          });

          // Update confidence with highest score
          acc[intent.action].confidence = Math.max(
            acc[intent.action].confidence,
            match.score,
          );
          return acc;
        },
        {},
      ) as any;
    if (!Object.keys(intentMatches).length) {
      return {
        best: null,
        alternatives: [],
      };
    }

    // Sort intents by confidence
    const sortedIntents = Object.values(intentMatches).sort(
      (a, b) => b.confidence - a.confidence,
    );

    return {
      best: sortedIntents[0],
      alternatives: sortedIntents.slice(1),
    };
  } catch (error) {
    console.error("Intent recognition error:", error);
    return {
      best: null,
      alternatives: [],
      error: { message: "Failed to classify intent", status: 500 },
    };
  }
};
