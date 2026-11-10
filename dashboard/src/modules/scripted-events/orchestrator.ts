import type { ScriptedEvent } from "./contracts";

export interface ScriptedEventPartition {
  visible: ScriptedEvent[];
  background: ScriptedEvent[];
  clyffyVisible: ScriptedEvent[];
  councilVisible: ScriptedEvent[];
  dataSinks: ScriptedEvent[];
  limitedTunnel: ScriptedEvent[];
}

export interface ScriptedEventComparison {
  total: number;
  visible: number;
  background: number;
  dataSinks: number;
  byKind: Record<ScriptedEvent["kind"], number>;
  bySource: Record<ScriptedEvent["source"], number>;
  byActor: Record<ScriptedEvent["actor"], number>;
}

export const partitionScriptedEvents = (
  events: ScriptedEvent[],
): ScriptedEventPartition => {
  const visible = events.filter((event) => event.visibility === "visible");
  const background = events.filter((event) => event.visibility === "background");
  const dataSinks = events.filter(
    (event) => event.delivery === "datasink" || event.delivery === "hybrid",
  );

  return {
    visible,
    background,
    clyffyVisible: visible.filter((event) => event.actor === "clyffy"),
    councilVisible: visible.filter((event) => event.actor === "council"),
    dataSinks,
    limitedTunnel: events.filter((event) => event.focus === "limited_tunnel"),
  };
};

export const buildScriptedEventComparison = (
  events: ScriptedEvent[],
): ScriptedEventComparison => {
  const partition = partitionScriptedEvents(events);
  const byKind: ScriptedEventComparison["byKind"] = {
    announcement: 0,
    tooltip: 0,
    popup: 0,
  };
  const bySource: ScriptedEventComparison["bySource"] = {
    knowledgedrop: 0,
    didyouknow: 0,
    operator: 0,
    system: 0,
    mcp: 0,
  };
  const byActor: ScriptedEventComparison["byActor"] = {
    clyffy: 0,
    council: 0,
    system: 0,
    operator: 0,
    mcp: 0,
  };

  for (const event of events) {
    byKind[event.kind] += 1;
    bySource[event.source] += 1;
    byActor[event.actor] += 1;
  }

  return {
    total: events.length,
    visible: partition.visible.length,
    background: partition.background.length,
    dataSinks: partition.dataSinks.length,
    byKind,
    bySource,
    byActor,
  };
};
