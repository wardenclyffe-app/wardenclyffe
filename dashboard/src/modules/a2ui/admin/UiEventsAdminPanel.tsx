"use client";

import { useApiCall } from "@utils/api";
import { type } from "arktype";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CanonicalButton } from "@/components/canonical/CanonicalButton";
import { CanonicalCard } from "@/components/canonical/CanonicalCard";
import {
  type UiEvent,
  UiEventContract,
  type UiEventRequest,
  UiEventRequestContract,
} from "../contracts/UiEvent";
import { useUiEventsData } from "../data/UiEventsProvider";
import { useUiEventRuntime } from "../runtime/UiEventRuntimeProvider";
import { UiEventEditor } from "./UiEventEditor";
import { UiTargetInventory } from "./UiTargetInventory";

const requestFor = (route: string): UiEventRequest => ({
  route,
  target: "",
  enabled: true,
  kind: "tooltip",
  trigger: "hover",
  title: "",
  body: "",
  priority: 0,
  provenance: { source: "operator", signal: "context-help" },
});
const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  )
    return error.message;
  return "UI event operation failed. The change has not been confirmed.";
};

export const UiEventsAdminPanel = ({
  canUpdate = false,
}: {
  canUpdate?: boolean;
}) => {
  const route = usePathname();
  const { targets, definitions, dispatch } = useUiEventRuntime();
  const { loading, error, refresh } = useUiEventsData();
  const api = useApiCall<unknown>("/ui-events", true);
  const [draft, setDraft] = useState<UiEventRequest>(() => requestFor(route));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const selectEvent = (event: UiEvent) => {
    const { id, ...request } = event;
    setEditingId(id);
    setDraft(request);
    setMessage(null);
  };
  const save = async (form: React.FormEvent) => {
    form.preventDefault();
    if (!canUpdate || busy) return;
    const parsed = UiEventRequestContract(draft);
    if (parsed instanceof type.errors) {
      setMessage(parsed.summary);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = editingId
        ? await api.put(parsed, `/${encodeURIComponent(editingId)}`)
        : await api.post(parsed);
      const saved = UiEventContract(response);
      if (saved instanceof type.errors)
        throw new Error(
          `Server returned an invalid saved event: ${saved.summary}`,
        );
      await refresh();
      setEditingId(saved.id);
      setMessage("Event saved to management.");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!canUpdate || busy || !editingId) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.del(undefined, `/${encodeURIComponent(editingId)}`);
      await refresh();
      setEditingId(null);
      setDraft(requestFor(route));
      setMessage("Event deleted from management.");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-[var(--wc-space-3)] p-[var(--wc-space-3)] text-nb-gray-100">
      <CanonicalCard
        heading="Database UI Events"
        subtitle="Account-scoped definitions. No browser-local event fallback or arbitrary scripts."
      >
        {loading && <p role="status">Loading event definitions...</p>}
        {error && <p role="alert">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <CanonicalButton
            disabled={busy}
            onClick={() => {
              setEditingId(null);
              setDraft(requestFor(route));
              setMessage(null);
            }}
          >
            New event
          </CanonicalButton>
          {definitions.map((event) => (
            <CanonicalButton key={event.id} onClick={() => selectEvent(event)}>
              {event.title} ({event.kind},{" "}
              {event.enabled ? "enabled" : "disabled"})
            </CanonicalButton>
          ))}
        </div>
        <UiEventEditor
          draft={draft}
          setDraft={setDraft}
          disabled={!canUpdate || busy}
          onSubmit={save}
        >
          <div className="flex flex-wrap gap-3">
            <CanonicalButton type="submit" disabled={!canUpdate || busy}>
              Save event
            </CanonicalButton>
            {editingId && (
              <CanonicalButton disabled={!canUpdate || busy} onClick={remove}>
                Delete event
              </CanonicalButton>
            )}
            {editingId && draft.trigger === "manual" && (
              <CanonicalButton
                disabled={
                  draft.route !== route ||
                  !targets.some(
                    (target) =>
                      target.target === draft.target &&
                      !target.ambiguous &&
                      !target.disabled,
                  )
                }
                onClick={() => {
                  if (!dispatch(draft.target, "manual"))
                    setMessage(
                      "The target is unavailable or no enabled saved event matches this route.",
                    );
                }}
              >
                Trigger saved event
              </CanonicalButton>
            )}
          </div>
          {message && <p role="status">{message}</p>}
        </UiEventEditor>
      </CanonicalCard>
      <UiTargetInventory
        targets={targets}
        canUpdate={canUpdate}
        onSelect={(target) => {
          if (target.target) {
            setEditingId(null);
            setDraft({
              ...requestFor(route),
              target: target.target,
              title: target.label,
            });
            setMessage(null);
          }
        }}
      />
    </div>
  );
};
