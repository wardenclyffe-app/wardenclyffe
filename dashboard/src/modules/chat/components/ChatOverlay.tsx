"use client";

import { useChat } from "../ChatProvider";
import { ChatBoundary } from "./ChatBoundary";

export const ChatOverlay = () => {
  const { preferences } = useChat();
  if (!preferences.enabled) return null;
  return (
    <ChatBoundary>
      <p id="chat-status" role="status" className="text-nb-gray-200">
        Chat is unavailable until a conversation backend is configured.
      </p>
      <label className="mt-3 block text-nb-gray-100" htmlFor="clyffy-message">
        Message Clyffy
      </label>
      <textarea
        id="clyffy-message"
        disabled
        aria-describedby="chat-status"
        className="mt-2 w-full rounded border border-nb-gray-700 bg-nb-gray-950 p-3 text-nb-gray-300"
        placeholder="Chat backend not connected"
      />
      <button
        type="button"
        disabled
        className="mt-2 min-h-12 rounded bg-nb-gray-800 px-4 text-nb-gray-300"
      >
        Send message
      </button>
    </ChatBoundary>
  );
};
