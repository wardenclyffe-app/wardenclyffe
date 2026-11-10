export const UI_CONTROL_SELECTOR = [
  "[data-ui-target]",
  "input:not([type=hidden])",
  "textarea",
  "select",
  "button",
  "[role=combobox]",
  "[role=checkbox]",
  "[role=switch]",
].join(",");

export interface UiTarget {
  key: string;
  target: string | null;
  component: string;
  label: string;
  disabled: boolean;
  ambiguous: boolean;
}

const EMPTY_TARGETS: UiTarget[] = [];
export const serverTargets = () => EMPTY_TARGETS;

export const targetName = (element: HTMLElement): string | null => {
  const explicit = element.dataset.uiTarget;
  if (explicit) return explicit;
  const identity = element.id || element.getAttribute("name");
  return identity ? `${element.tagName.toLowerCase()}.${identity}` : null;
};

const controlLabel = (element: HTMLElement): string => {
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy)
    return labelledBy
      .split(/\s+/)
      .map(
        (id) =>
          element.ownerDocument.getElementById(id)?.textContent?.trim() ?? "",
      )
      .join(" ")
      .trim();
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return Array.from(element.labels ?? [])
      .map((label) => label.textContent?.trim() ?? "")
      .join(" ");
  }
  return element.tagName === "BUTTON" ? element.textContent?.trim() ?? "" : "";
};

export class UiTargetRegistry {
  private targets = EMPTY_TARGETS;
  private elements: HTMLElement[] = [];
  private observers = new Set<() => void>();
  private mutationObserver?: MutationObserver;
  private keys = new WeakMap<HTMLElement, string>();
  private nextKey = 0;

  constructor(private readonly root: Document) {}

  readonly snapshot = () => this.targets;

  readonly subscribe = (notify: () => void) => {
    this.observers.add(notify);
    if (!this.mutationObserver) {
      this.mutationObserver = new MutationObserver(this.scan);
      this.mutationObserver.observe(this.root.body, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
        attributeFilter: [
          "id",
          "name",
          "data-ui-target",
          "data-ui-component",
          "disabled",
          "aria-label",
          "aria-labelledby",
          "aria-disabled",
        ],
      });
      this.scan();
    }
    return () => {
      this.observers.delete(notify);
      if (this.observers.size === 0) {
        this.mutationObserver?.disconnect();
        this.mutationObserver = undefined;
        this.elements = [];
        this.targets = EMPTY_TARGETS;
      }
    };
  };

  readonly scan = () => {
    this.elements = Array.from(
      this.root.querySelectorAll<HTMLElement>(UI_CONTROL_SELECTOR),
    ).filter((element) => !element.closest("[data-ui-registry-inspector]"));
    const counts = new Map<string, number>();
    for (const element of this.elements) {
      const name = targetName(element);
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const targets = this.elements.map((element): UiTarget => {
      let key = this.keys.get(element);
      if (!key) {
        key = `control-${++this.nextKey}`;
        this.keys.set(element, key);
      }
      const target = targetName(element);
      return {
        key,
        target,
        component: element.dataset.uiComponent ?? element.tagName.toLowerCase(),
        label: controlLabel(element),
        disabled:
          element.matches(":disabled") ||
          element.getAttribute("aria-disabled") === "true",
        ambiguous: !!target && (counts.get(target) ?? 0) > 1,
      };
    });
    if (JSON.stringify(targets) === JSON.stringify(this.targets)) return;
    this.targets = targets;
    this.observers.forEach((notify) => notify());
  };

  resolve(name: string): HTMLElement | null {
    const matches = this.elements.filter(
      (element) =>
        element.isConnected &&
        !element.closest("[hidden], [inert]") &&
        targetName(element) === name,
    );
    return matches.length === 1 ? matches[0] : null;
  }
}
