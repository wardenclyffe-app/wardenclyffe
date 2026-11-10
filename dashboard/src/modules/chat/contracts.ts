import { type } from "arktype";

export const ChatPreferencesContract = type({
  "+": "reject",
  enabled: "boolean",
});

export type ChatPreferences = typeof ChatPreferencesContract.infer;

export const ChatMessageContract = type({
  "+": "reject",
  id: "string > 0",
  role: "'user' | 'assistant'",
  text: "string > 0",
});

export type ChatMessage = typeof ChatMessageContract.infer;
