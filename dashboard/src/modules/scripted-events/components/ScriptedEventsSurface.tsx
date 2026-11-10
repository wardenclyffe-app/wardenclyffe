"use client";

import { useState } from "react";
import { CanonicalButton } from "@/components/canonical/CanonicalButton";
import { CanonicalCard } from "@/components/canonical/CanonicalCard";
import type { ScriptedEvent } from "../contracts";
import { useScriptedEventLanes } from "../ScriptedEventsProvider";

const eventText = (event: ScriptedEvent) => {
  if (event.kind === "announcement") return event.announcement?.text ?? "";
  if (event.kind === "tooltip") return event.tooltip?.text ?? "";
  return event.popup?.body ?? "";
};

export const ScriptedEventsSurface = () => {
  const [dismissedId, setDismissedId] = useState<string>();
  const lanes = useScriptedEventLanes();
  const featured = lanes.visible.find((event) => event.delivery !== "datasink");
  if (!featured || featured.id === dismissedId) return null;

  return (
    <aside
      aria-label="Scripted knowledge events"
      className="wc-shell-frame mx-[var(--wc-space-2)] mb-[var(--wc-space-2)] p-3"
    >
      <CanonicalCard
        heading="Scripted Knowledge"
        subtitle="Knowledge drops and provenance. Not a chat message."
        actions={
          <CanonicalButton
            size="sm"
            onClick={() => setDismissedId(featured.id)}
          >
            Dismiss event
          </CanonicalButton>
        }
      >
        <p className="wc-fluid-text-xs text-wardenclyffe-300">
          {featured.actor} · {featured.source} · {featured.focus}
        </p>
        <p className="text-nb-gray-100">{eventText(featured)}</p>
      </CanonicalCard>
    </aside>
  );
};
