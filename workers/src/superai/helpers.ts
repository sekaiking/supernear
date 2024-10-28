import { Intent } from "./types";
import INTENTS from "../../data/intents.2.json";

export function get_intent_by_id(id: number): Intent {
  return INTENTS[id];
}

export function get_intent_by_action(action: string): Intent {
  return INTENTS.find((i) => i.action == action) as Intent;
}
