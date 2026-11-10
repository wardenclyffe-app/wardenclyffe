import { afterEach, describe, expect, it } from "vitest";
import { UiTargetRegistry } from "./UiTargetRegistry";

afterEach(() => {
  document.body.replaceChildren();
});

describe("UiTargetRegistry", () => {
  it("accounts for every supported mounted native control without values", () => {
    document.body.innerHTML = `<label for="email">Email</label><input id="email" value="not-collected">
      <textarea name="notes"></textarea><select id="choice"><option>First</option></select>
      <input type="password" name="password" value="private">
      <input type="checkbox" name="check"><button id="action">Run</button><input type="hidden" name="hidden">
      <input><button role="combobox" data-ui-target="ui.combo">Options</button>
      <div data-ui-registry-inspector><button>Inspector operation</button></div>`;
    const registry = new UiTargetRegistry(document);
    const unsubscribe = registry.subscribe(() => {});
    expect(registry.snapshot()).toHaveLength(8);
    expect(
      registry.snapshot().filter((target) => target.target === null),
    ).toHaveLength(1);
    expect(JSON.stringify(registry.snapshot())).not.toContain("not-collected");
    expect(JSON.stringify(registry.snapshot())).not.toContain("private");
    expect(registry.resolve("input.email")?.id).toBe("email");
    unsubscribe();
    expect(registry.snapshot()).toHaveLength(0);
  });
  it("reports duplicates and never resolves them to an arbitrary control", () => {
    document.body.innerHTML = `<input data-ui-target="ui.duplicate"><input data-ui-target="ui.duplicate">`;
    const registry = new UiTargetRegistry(document);
    const unsubscribe = registry.subscribe(() => {});
    expect(registry.snapshot().every((target) => target.ambiguous)).toBe(true);
    expect(registry.resolve("ui.duplicate")).toBeNull();
    document.body.lastElementChild?.remove();
    registry.scan();
    expect(registry.resolve("ui.duplicate")).toBeTruthy();
    unsubscribe();
  });
});
