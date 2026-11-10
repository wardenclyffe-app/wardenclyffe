"use client";

import { type } from "arktype";
import React, { createContext, useContext } from "react";
import { useValidatedLocalStorage } from "@/hooks/useValidatedLocalStorage";
import { type ChatPreferences, ChatPreferencesContract } from "./contracts";

const STORAGE_KEY = "wardenclyffe-chat-preferences-v1";
const DEFAULT_PREFERENCES: ChatPreferences = { enabled: true };
const validatePreferences = (payload: unknown): ChatPreferences => {
  const parsed = ChatPreferencesContract(payload);
  if (parsed instanceof type.errors) throw new Error(parsed.summary);
  return parsed;
};
const ChatContext = createContext<{
  preferences: ChatPreferences;
  setEnabled: (enabled: boolean) => void;
} | null>(null);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [preferences, setPreferences] = useValidatedLocalStorage(
    STORAGE_KEY,
    DEFAULT_PREFERENCES,
    validatePreferences,
  );
  return (
    <ChatContext.Provider
      value={{
        preferences,
        setEnabled: (enabled) => setPreferences({ enabled }),
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
};
