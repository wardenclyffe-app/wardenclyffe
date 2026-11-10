"use client";

import { CanonicalButton } from "@/components/canonical/CanonicalButton";
import { CanonicalCard } from "@/components/canonical/CanonicalCard";
import { useScriptedEvents } from "../ScriptedEventsProvider";

const eventSummary = (event: {
  kind: "announcement" | "tooltip" | "popup";
  announcement?: { text: string };
  tooltip?: { text: string };
  popup?: { title: string };
}) => {
  if (event.kind === "announcement")
    return event.announcement?.text ?? "announcement";
  if (event.kind === "tooltip") return event.tooltip?.text ?? "tooltip";
  return event.popup?.title ?? "popup";
};

export const ScriptedEventsAdminPanel = ({
  canUpdate = false,
}: {
  canUpdate?: boolean;
}) => {
  const {
    events,
    laneFilters,
    setLaneFilters,
    setEventEnabled,
    resetDefaults,
    comparison,
  } = useScriptedEvents();

  return (
    <div className="p-default py-6 space-y-[var(--wc-space-3)]">
      <CanonicalCard
        heading="Scripted Event Control Plane"
        subtitle="Browser-local event previews, visibility and data-sink classification. Not chat or MCP settings."
        actions={
          <CanonicalButton
            variant="secondary"
            size="sm"
            disabled={!canUpdate}
            onClick={() => {
              if (canUpdate) resetDefaults();
            }}
          >
            Reset to defaults
          </CanonicalButton>
        }
      >
        <div className="grid gap-[var(--wc-space-2)] md:grid-cols-3">
          <label className="flex items-center gap-2 text-nb-gray-200">
            <input
              type="checkbox"
              disabled={!canUpdate}
              checked={laneFilters.clyffyVisible}
              onChange={(e) =>
                canUpdate &&
                setLaneFilters((prev) => ({
                  ...prev,
                  clyffyVisible: e.target.checked,
                }))
              }
            />
            Show Clyffy visible lane
          </label>
          <label className="flex items-center gap-2 text-nb-gray-200">
            <input
              type="checkbox"
              disabled={!canUpdate}
              checked={laneFilters.councilVisible}
              onChange={(e) =>
                canUpdate &&
                setLaneFilters((prev) => ({
                  ...prev,
                  councilVisible: e.target.checked,
                }))
              }
            />
            Show Council visible lane
          </label>
          <label className="flex items-center gap-2 text-nb-gray-200">
            <input
              type="checkbox"
              disabled={!canUpdate}
              checked={laneFilters.includeBackground}
              onChange={(e) =>
                canUpdate &&
                setLaneFilters((prev) => ({
                  ...prev,
                  includeBackground: e.target.checked,
                }))
              }
            />
            Include background sink lane
          </label>
        </div>
      </CanonicalCard>

      <CanonicalCard
        heading="Event Fabric Inventory"
        subtitle="Enable only what should surface in the UX"
      >
        <div className="space-y-[var(--wc-space-2)]">
          {events.map((event) => (
            <label
              key={event.id}
              className="flex items-start justify-between gap-3 rounded-[var(--wc-radius-sm)] border border-nb-gray-850 px-[var(--wc-space-2)] py-[var(--wc-space-2)]"
            >
              <div>
                <p className="text-nb-gray-100 wc-fluid-text-sm">{event.id}</p>
                <p className="text-nb-gray-300 wc-fluid-text-xs">
                  {event.actor} · {event.source} · {event.visibility} ·{" "}
                  {event.delivery}
                </p>
                <p className="text-nb-gray-250 wc-fluid-text-xs">
                  {eventSummary(event)}
                </p>
              </div>
              <input
                type="checkbox"
                disabled={!canUpdate}
                checked={event.enabled !== false}
                onChange={(e) => {
                  if (canUpdate) setEventEnabled(event.id, e.target.checked);
                }}
                aria-label={`Enable ${event.id}`}
              />
            </label>
          ))}
        </div>
      </CanonicalCard>

      <CanonicalCard heading="Comparison Counters">
        <div className="grid gap-[var(--wc-space-2)] md:grid-cols-2">
          <p>Total enabled: {comparison.total}</p>
          <p>Visible events: {comparison.visible}</p>
          <p>Background events: {comparison.background}</p>
          <p>Data sink events: {comparison.dataSinks}</p>
          <p>Clyffy events: {comparison.byActor.clyffy}</p>
          <p>Council events: {comparison.byActor.council}</p>
        </div>
      </CanonicalCard>
    </div>
  );
};
