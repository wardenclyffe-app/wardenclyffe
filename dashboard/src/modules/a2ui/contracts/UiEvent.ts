import { type } from "arktype";

export const UiEventRequestContract = type({
  "+": "reject",
  enabled: "boolean",
  route: /^\/[^\s?#]*$/,
  target: /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,199}$/,
  trigger: "'hover' | 'focus' | 'click' | 'manual'",
  kind: "'tooltip' | 'popup'",
  title: "0 < string <= 200",
  body: "0 < string <= 4000",
  priority: "0 <= number.integer <= 100000",
  provenance: {
    "+": "reject",
    source: "0 < string <= 200",
    signal: "0 < string <= 200",
  },
});

export const UiEventContract = UiEventRequestContract.merge({
  id: "string > 0",
}).onUndeclaredKey("reject");
export const UiEventsContract = UiEventContract.array();
export type UiEvent = typeof UiEventContract.infer;
export type UiEventRequest = typeof UiEventRequestContract.infer;

export const parseUiEvents = (payload: unknown): UiEvent[] => {
  const parsed = UiEventsContract(payload);
  if (parsed instanceof type.errors)
    throw new Error(`Invalid UI events: ${parsed.summary}`);
  return parsed;
};
