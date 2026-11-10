import { describe, expect, it, vi } from "vitest";
import { observeDashboardSignals } from "./signals";

describe("MCPL native signal adapter", () => {
  it("ignores programmatic events and tears down its listeners idempotently", () => {
    const root = document.implementation.createHTMLDocument();
    root.body.innerHTML =
      '<input data-ui-target="private.field" value="not collected">';
    const receive = vi.fn();
    const reject = vi.fn();
    const remove = vi.spyOn(root, "removeEventListener");
    const stop = observeDashboardSignals(root, "/ui-events", receive, reject);
    root
      .querySelector("input")
      ?.dispatchEvent(new Event("input", { bubbles: true }));
    expect(receive).not.toHaveBeenCalled();
    expect(reject).not.toHaveBeenCalled();
    stop();
    stop();
    expect(remove).toHaveBeenCalledTimes(6);
  });
});
