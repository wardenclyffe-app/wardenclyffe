import { type } from "arktype";
import { parseScriptedEventsPayload } from "@/modules/scripted-events/parser";
import { ScriptedEventsToolResultContract } from "../contracts/scripted-events";

export const parseScriptedEventsToolResult = (payload: unknown) => {
  const result = ScriptedEventsToolResultContract(payload);
  if (result instanceof type.errors) {
    throw new Error(`Invalid scripted-events tool result: ${result.summary}`);
  }
  return parseScriptedEventsPayload(result.events);
};
