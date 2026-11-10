"use client";

import { useUiEventRuntime } from "../../runtime/UiEventRuntimeProvider";
import { UiEventPopup } from "../popup/UiEventPopup";
import { UiEventTooltip } from "../tooltip/UiEventTooltip";

const renderers = { tooltip: UiEventTooltip, popup: UiEventPopup };

export const UiEventRenderer = () => {
  const { active, dismiss } = useUiEventRuntime();
  if (!active) return null;
  const Renderer = renderers[active.definition.kind];
  return (
    <Renderer
      key={active.definition.id}
      event={active.definition}
      anchor={active.anchor}
      onDismiss={dismiss}
    />
  );
};
