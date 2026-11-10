"use client";

import { useOidcUser } from "@axa-fr/react-oidc";
import useFetchApi from "@utils/api";
import { type } from "arktype";
import React, { createContext, useContext, useMemo } from "react";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { type UiEvent, UiEventsContract } from "../contracts/UiEvent";
import { UiEventRuntimeProvider } from "../runtime/UiEventRuntimeProvider";

const EMPTY_EVENTS: UiEvent[] = [];
const UiEventsDataContext = createContext<{
  loading: boolean;
  error: string | null;
  refresh: () => Promise<unknown>;
} | null>(null);

export const UiEventsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { oidcUser } = useOidcUser();
  const { globalApiParams } = useApplicationContext();
  const scope = JSON.stringify({
    subject: oidcUser?.sub,
    params: globalApiParams,
  });
  const { data, error, isLoading, mutate } = useFetchApi<unknown>(
    "/ui-events",
    true,
    true,
    !!oidcUser,
    {
      refreshInterval: 30000,
      shouldRetryOnError: false,
      key: scope,
      keepPreviousData: false,
    },
  );
  const parsed = useMemo(() => {
    if (data === undefined)
      return { definitions: EMPTY_EVENTS, schemaError: null };
    const result = UiEventsContract(data);
    return result instanceof type.errors
      ? {
          definitions: EMPTY_EVENTS,
          schemaError: `Invalid event definitions: ${result.summary}`,
        }
      : { definitions: result, schemaError: null };
  }, [data]);
  const message = error
    ? "UI event definitions could not be loaded. No events are active."
    : parsed.schemaError;
  return (
    <UiEventsDataContext.Provider
      value={{ loading: isLoading, error: message, refresh: () => mutate() }}
    >
      <UiEventRuntimeProvider
        key={scope}
        definitions={message ? EMPTY_EVENTS : parsed.definitions}
      >
        {message && (
          <p role="alert" className="border border-red-500 p-3 text-red-300">
            {message}
          </p>
        )}
        {children}
      </UiEventRuntimeProvider>
    </UiEventsDataContext.Provider>
  );
};

export const useUiEventsData = () => {
  const context = useContext(UiEventsDataContext);
  if (!context)
    throw new Error("useUiEventsData must be used inside UiEventsProvider");
  return context;
};
