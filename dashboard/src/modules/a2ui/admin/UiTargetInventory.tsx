"use client";

import { CanonicalButton } from "@/components/canonical/CanonicalButton";
import { CanonicalCard } from "@/components/canonical/CanonicalCard";
import type { UiTarget } from "../runtime/UiTargetRegistry";

export const UiTargetInventory = ({
  targets,
  canUpdate,
  onSelect,
}: {
  targets: UiTarget[];
  canUpdate: boolean;
  onSelect: (target: UiTarget) => void;
}) => (
  <CanonicalCard
    heading="Live Control Registry"
    subtitle="All mounted inputs and controls. Values, passwords, and tokens are never collected."
  >
    <p>
      {targets.length} controls ·{" "}
      {targets.filter((target) => !target.target).length} missing stable targets
      · {targets.filter((target) => !target.label).length} missing accessible
      names · {targets.filter((target) => target.ambiguous).length} duplicate
      targets
    </p>
    <div
      data-ui-registry-inspector
      className="mt-3 max-h-[50dvh] overflow-auto"
    >
      {targets.map((target) => (
        <div
          key={target.key}
          className="grid gap-2 border-b border-nb-gray-800 py-3"
        >
          <p>
            {target.label || "Missing accessible name"} · {target.component}
          </p>
          <code className="break-all">
            {target.target ?? "Missing id, name, or data-ui-target"}
          </code>
          <p>
            {target.ambiguous
              ? "Ambiguous: dispatch denied"
              : target.disabled
              ? "Disabled"
              : "Available"}
          </p>
          <CanonicalButton
            disabled={!canUpdate || !target.target || target.ambiguous}
            onClick={() => onSelect(target)}
          >
            Configure target event
          </CanonicalButton>
        </div>
      ))}
    </div>
  </CanonicalCard>
);
