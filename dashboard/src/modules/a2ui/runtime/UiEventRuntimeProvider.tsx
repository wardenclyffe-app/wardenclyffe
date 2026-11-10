"use client";

import { usePathname } from "next/navigation";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { UiEventRenderer } from "../components/event/UiEventRenderer";
import type { UiEvent } from "../contracts/UiEvent";
import {
  serverTargets,
  targetName,
  UI_CONTROL_SELECTOR,
  type UiTarget,
  UiTargetRegistry,
} from "./UiTargetRegistry";

interface ActiveUiEvent {
  definition: UiEvent;
  anchor: HTMLElement;
}
interface UiEventRuntime {
  targets: UiTarget[];
  definitions: UiEvent[];
  active: ActiveUiEvent | null;
  dispatch: (target: string, trigger: UiEvent["trigger"]) => boolean;
  dismiss: () => void;
}

const UiEventContext = createContext<UiEventRuntime | null>(null);
const noopSubscribe = () => () => {};

export const UiEventRuntimeProvider = ({
  children,
  definitions,
}: {
  children: React.ReactNode;
  definitions: UiEvent[];
}) => {
  const route = usePathname();
  const [registry] = useState(() =>
    typeof document === "undefined" ? null : new UiTargetRegistry(document),
  );
  const targets = useSyncExternalStore(
    registry?.subscribe ?? noopSubscribe,
    registry?.snapshot ?? serverTargets,
    serverTargets,
  );
  const [active, setActive] = useState<ActiveUiEvent | null>(null);
  const dismiss = useCallback(() => setActive(null), []);
  const dispatch = useCallback(
    (target: string, trigger: UiEvent["trigger"]) => {
      const anchor = registry?.resolve(target);
      if (
        !anchor ||
        anchor.matches(":disabled") ||
        anchor.getAttribute("aria-disabled") === "true"
      )
        return false;
      const definition = definitions
        .filter(
          (event) =>
            event.enabled &&
            event.route === route &&
            event.target === target &&
            (event.trigger === trigger ||
              (trigger === "focus" &&
                event.trigger === "hover" &&
                event.kind === "tooltip")),
        )
        .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))[0];
      if (!definition) return false;
      setActive({ definition, anchor });
      return true;
    },
    [definitions, registry, route],
  );

  useEffect(() => {
    const handle = (event: Event) => {
      const element =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(UI_CONTROL_SELECTOR)
          : null;
      if (!element) return;
      if (
        event.type === "pointerover" &&
        event instanceof MouseEvent &&
        event.relatedTarget instanceof Node &&
        element.contains(event.relatedTarget)
      )
        return;
      const name = targetName(element);
      if (name)
        dispatch(
          name,
          event.type === "pointerover"
            ? "hover"
            : event.type === "focusin"
            ? "focus"
            : "click",
        );
    };
    document.addEventListener("pointerover", handle);
    document.addEventListener("focusin", handle);
    document.addEventListener("click", handle);
    return () => {
      document.removeEventListener("pointerover", handle);
      document.removeEventListener("focusin", handle);
      document.removeEventListener("click", handle);
    };
  }, [dispatch]);

  const current =
    active &&
    active.anchor.isConnected &&
    active.definition.route === route &&
    definitions.includes(active.definition)
      ? active
      : null;
  const value = useMemo(
    () => ({ targets, definitions, active: current, dispatch, dismiss }),
    [targets, definitions, current, dispatch, dismiss],
  );
  return (
    <UiEventContext.Provider value={value}>
      {children}
      <UiEventRenderer />
    </UiEventContext.Provider>
  );
};

export const useUiEventRuntime = () => {
  const context = useContext(UiEventContext);
  if (!context)
    throw new Error(
      "useUiEventRuntime must be used inside UiEventRuntimeProvider",
    );
  return context;
};
