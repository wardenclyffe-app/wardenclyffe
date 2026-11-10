import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UiInput } from "../components/input/UiInput";
import { UiTextarea } from "../components/textarea/UiTextarea";
import { parseUiEvents, type UiEvent } from "../contracts/UiEvent";
import {
  UiEventRuntimeProvider,
  useUiEventRuntime,
} from "./UiEventRuntimeProvider";

vi.mock("next/navigation", () => ({ usePathname: () => "/ui-events" }));
afterEach(cleanup);

const definition: UiEvent = {
  id: "event-1",
  enabled: true,
  route: "/ui-events",
  target: "ui.test.name",
  kind: "tooltip",
  trigger: "hover",
  title: "Context",
  body: "Database content",
  priority: 10,
  provenance: { source: "KnowledgeDrop", signal: "name-help" },
};
const Probe = () => {
  const { targets, dispatch } = useUiEventRuntime();
  return (
    <>
      <output data-testid="registry">{JSON.stringify(targets)}</output>
      <button onClick={() => dispatch("ui.test.name", "manual")}>
        Dispatch manual event
      </button>
    </>
  );
};
const controls = (
  <>
    <label htmlFor="name-field">Name</label>
    <UiInput id="name-field" eventTarget="ui.test.name" />
    <label htmlFor="description-field">Description</label>
    <UiTextarea id="description-field" eventTarget="ui.test.description" />
    <label>
      <input type="checkbox" name="native-checkbox" />
      Native checkbox
    </label>
    <Probe />
  </>
);
const mount = (definitions = [definition]) =>
  render(
    <UiEventRuntimeProvider definitions={definitions}>
      {controls}
    </UiEventRuntimeProvider>,
  );

describe("native UI event runtime", () => {
  it("uses explicit manual dispatch and selects highest priority deterministically", async () => {
    mount([
      {
        ...definition,
        id: "low",
        trigger: "manual",
        body: "Lower priority",
        priority: 1,
      },
      {
        ...definition,
        id: "high",
        trigger: "manual",
        body: "Higher priority",
        priority: 2,
      },
    ]);
    fireEvent.pointerOver(screen.getByLabelText("Name"));
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Dispatch manual event" }),
    );
    expect((await screen.findByRole("tooltip")).textContent).toContain(
      "Higher priority",
    );
    expect(screen.queryByText("Lower priority")).toBeNull();
  });
  it("shows database tooltip content on hover and keyboard focus without changing input value", async () => {
    mount();
    const input = screen.getByLabelText<HTMLInputElement>("Name");
    input.value = "private user input";
    fireEvent.pointerOver(input);
    expect((await screen.findByRole("tooltip")).textContent).toContain(
      "Database content",
    );
    expect(screen.getByText("Database content")).toBeTruthy();
    expect(input.value).toBe("private user input");
    expect(input.getAttribute("aria-describedby")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.focusIn(input);
    expect(await screen.findByRole("tooltip")).toBeTruthy();
    fireEvent.focusOut(input);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
  it("renders a real popup for click/tap with accessible title and restores focus", async () => {
    mount([{ ...definition, kind: "popup", trigger: "click" }]);
    const input = screen.getByLabelText("Name");
    fireEvent.click(input);
    expect(await screen.findByRole("dialog", { name: "Context" })).toBeTruthy();
    expect(screen.getByText("Database content")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close event" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("registers native and canonical fields without reading values", async () => {
    mount([]);
    await waitFor(() =>
      expect(screen.getByTestId("registry").textContent).toContain(
        "input.native-checkbox",
      ),
    );
    const input = screen.getByLabelText<HTMLInputElement>("Name");
    input.value = "secret-value";
    expect(screen.getByTestId("registry").textContent).not.toContain(
      "secret-value",
    );
    expect(screen.getByTestId("registry").textContent).toContain(
      "ui.test.description",
    );
  });
  it("denies duplicate targets, disabled definitions, and mismatched routes", async () => {
    const { rerender } = render(
      <UiEventRuntimeProvider definitions={[definition]}>
        <input data-ui-target="ui.test.name" aria-label="First" />
        <input data-ui-target="ui.test.name" aria-label="Second" />
      </UiEventRuntimeProvider>,
    );
    fireEvent.pointerOver(screen.getByLabelText("First"));
    expect(screen.queryByRole("tooltip")).toBeNull();
    rerender(
      <UiEventRuntimeProvider definitions={[{ ...definition, enabled: false }]}>
        {controls}
      </UiEventRuntimeProvider>,
    );
    await waitFor(() => expect(screen.getByLabelText("Name")).toBeTruthy());
    fireEvent.pointerOver(screen.getByLabelText("Name"));
    expect(screen.queryByRole("tooltip")).toBeNull();
    rerender(
      <UiEventRuntimeProvider
        definitions={[{ ...definition, route: "/other" }]}
      >
        {controls}
      </UiEventRuntimeProvider>,
    );
    fireEvent.pointerOver(screen.getByLabelText("Name"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
  it("removes a visible event when its database definition is removed", async () => {
    const { rerender } = mount();
    fireEvent.pointerOver(screen.getByLabelText("Name"));
    expect(await screen.findByRole("tooltip")).toBeTruthy();
    rerender(
      <UiEventRuntimeProvider definitions={[]}>
        {controls}
      </UiEventRuntimeProvider>,
    );
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
  it("rejects executable/unknown fields and malformed contracts", () => {
    expect(parseUiEvents([definition])).toEqual([definition]);
    expect(() =>
      parseUiEvents([{ ...definition, script: "alert(1)" }]),
    ).toThrow("Invalid UI events");
    expect(() =>
      parseUiEvents([{ ...definition, target: "#arbitrary-selector" }]),
    ).toThrow("Invalid UI events");
  });
});
