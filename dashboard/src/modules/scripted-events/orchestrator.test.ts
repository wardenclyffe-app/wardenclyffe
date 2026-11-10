import { describe, expect, it } from "vitest";
import {
  buildScriptedEventComparison,
  partitionScriptedEvents,
} from "./orchestrator";
import type { ScriptedEvent } from "./contracts";

const sampleEvents: ScriptedEvent[] = [
  {
    id: "evt-1",
    kind: "tooltip",
    trigger: "hover",
    source: "didyouknow",
    actor: "clyffy",
    visibility: "visible",
    delivery: "ui",
    focus: "limited_tunnel",
    priority: 10,
    tooltip: {
      id: "tip-1",
      text: "Pinned helper for first-run setup.",
      placement: "right",
    },
  },
  {
    id: "evt-2",
    kind: "announcement",
    trigger: "app_load",
    source: "knowledgedrop",
    actor: "council",
    councilRole: "guide",
    visibility: "visible",
    delivery: "hybrid",
    focus: "full",
    priority: 5,
    announcement: {
      tag: "New",
      text: "Council guide enabled for onboarding.",
      variant: "important",
      closeable: true,
      isCloudOnly: false,
    },
  },
  {
    id: "evt-3",
    kind: "popup",
    trigger: "scheduled",
    source: "system",
    actor: "system",
    visibility: "background",
    delivery: "datasink",
    focus: "limited_tunnel",
    priority: 1,
    popup: {
      id: "pop-1",
      title: "Model sync window",
      body: "Collecting hidden telemetry events.",
    },
  },
];

describe("partitionScriptedEvents", () => {
  it("separates visible, background and sink lanes", () => {
    const partition = partitionScriptedEvents(sampleEvents);

    expect(partition.visible).toHaveLength(2);
    expect(partition.background).toHaveLength(1);
    expect(partition.clyffyVisible).toHaveLength(1);
    expect(partition.councilVisible).toHaveLength(1);
    expect(partition.dataSinks).toHaveLength(2);
    expect(partition.limitedTunnel).toHaveLength(2);
  });
});

describe("buildScriptedEventComparison", () => {
  it("produces deterministic comparison counters", () => {
    const comparison = buildScriptedEventComparison(sampleEvents);

    expect(comparison.total).toBe(3);
    expect(comparison.visible).toBe(2);
    expect(comparison.background).toBe(1);
    expect(comparison.dataSinks).toBe(2);
    expect(comparison.byKind).toEqual({
      announcement: 1,
      tooltip: 1,
      popup: 1,
    });
    expect(comparison.bySource.didyouknow).toBe(1);
    expect(comparison.bySource.knowledgedrop).toBe(1);
    expect(comparison.bySource.system).toBe(1);
    expect(comparison.byActor.clyffy).toBe(1);
    expect(comparison.byActor.council).toBe(1);
    expect(comparison.byActor.system).toBe(1);
  });
});
