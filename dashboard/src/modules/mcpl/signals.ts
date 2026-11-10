import {
  targetName,
  UI_CONTROL_SELECTOR,
  UiTargetRegistry,
} from "@/modules/a2ui/runtime/UiTargetRegistry";
import { dashboardCatalog, resolveAlias } from "./catalog";
import type { LiveSignal } from "./recipe";

const nativeEvents = [
  "click",
  "focusin",
  "pointerover",
  "input",
  "change",
  "submit",
] as const;

/** Observe metadata only; this adapter never reads control values or performs actions. */
export function observeDashboardSignals(
  root: Document,
  route: string,
  receive: (signal: LiveSignal) => void,
  reject: (message: string) => void,
) {
  const registry = new UiTargetRegistry(root);
  const unsubscribe = registry.subscribe(() => {});
  const handle = (event: Event) => {
    // Ignore manually dispatched events; browser trust is not authorization.
    if (!event.isTrusted) return;
    const element =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>(UI_CONTROL_SELECTOR)
        : null;
    if (
      !element ||
      element.closest("[data-ui-registry-inspector]") ||
      element.closest("[hidden], [inert], [aria-hidden=true]") ||
      element.matches(
        ":disabled, [aria-disabled=true], input[type=password], input[type=hidden], input[type=file]",
      )
    )
      return;
    if (
      event instanceof MouseEvent &&
      event.relatedTarget instanceof Node &&
      element.contains(event.relatedTarget)
    )
      return;
    const target = targetName(element);
    if (!target) {
      reject("Interaction ignored: control has no stable MCPL target.");
      return;
    }
    // Recheck synchronously; MutationObserver may not have processed a replacement yet.
    registry.scan();
    if (registry.resolve(target) !== element) {
      reject(
        `Interaction ignored: target is ambiguous or unavailable (${target}).`,
      );
      return;
    }
    const id = resolveAlias(dashboardCatalog, "signal", event.type).id;
    receive({ id, target, route, timestamp: Date.now() });
  };
  nativeEvents.forEach((name) => root.addEventListener(name, handle, true));
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    nativeEvents.forEach((name) =>
      root.removeEventListener(name, handle, true),
    );
    unsubscribe();
  };
}
