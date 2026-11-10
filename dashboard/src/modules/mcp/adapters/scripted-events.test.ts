import { describe, expect, it } from "vitest";
import { defaultScriptedEvents } from "@/modules/scripted-events/defaults";
import { parseScriptedEventsToolResult } from "./scripted-events";

describe("scripted-events tool adapter", () => {
  it("validates and passes only events to the event layer", () => {
    expect(
      parseScriptedEventsToolResult({
        requestId: "req-1",
        events: defaultScriptedEvents,
        generatedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toEqual(defaultScriptedEvents);
  });
  it("rejects malformed tool payloads", () => {
    expect(() =>
      parseScriptedEventsToolResult({
        requestId: "req-1",
        events: [{ id: "evt-1", kind: "tooltip" }],
      }),
    ).toThrow("Invalid scripted-events tool result");
  });
  it("rejects chat messages as tool results", () => {
    expect(() =>
      parseScriptedEventsToolResult({
        id: "message-1",
        role: "assistant",
        text: "Hello",
      }),
    ).toThrow("Invalid scripted-events tool result");
  });
  it("does not dispatch or render a result", () => {
    const event = defaultScriptedEvents[0];
    expect(
      parseScriptedEventsToolResult({ requestId: "req-2", events: [event] }),
    ).toEqual([event]);
  });
  it("rejects a payload whose kind has no matching content", () => {
    expect(
      parseScriptedEventsToolResult({
        requestId: "req-3",
        events: [
          {
            ...defaultScriptedEvents[0],
            kind: "popup",
          },
        ],
      }),
    ).toEqual([]);
  });
});
