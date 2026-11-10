import { type } from "arktype";
import { ScriptedEventContract } from "@/modules/scripted-events/contracts";

// Application tool payloads, not MCP JSON-RPC transport envelopes.
export const ScriptedEventsToolRequestContract = type({
  "+": "reject",
  requestId: "string > 0",
  context: {
    "+": "reject",
    route: "string > 0",
    locale: "string > 0",
    "userRole?": "string > 0",
    "featureFlags?": "Record<string, boolean>",
  },
  "signals?": {
    "+": "reject",
    "hoverTarget?": "string > 0",
    "lastAction?": "string > 0",
    "openPanels?": "string[]",
  },
});

export const ScriptedEventsToolResultContract = type({
  "+": "reject",
  requestId: "string > 0",
  events: ScriptedEventContract.array(),
  "generatedAt?": "string.date.iso",
});

export type ScriptedEventsToolRequest =
  typeof ScriptedEventsToolRequestContract.infer;
export type ScriptedEventsToolResult =
  typeof ScriptedEventsToolResultContract.infer;
