import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UiEvent } from "../contracts/UiEvent";
import { UiEventsProvider } from "./UiEventsProvider";

const state = vi.hoisted(() => ({
  data: undefined as unknown,
  error: null as unknown,
  subject: "user-1",
  params: { account_id: "account-1" },
  fetch: vi.fn(),
}));
vi.mock("@axa-fr/react-oidc", () => ({
  useOidcUser: () => ({ oidcUser: { sub: state.subject } }),
}));
vi.mock("@/contexts/ApplicationProvider", () => ({
  useApplicationContext: () => ({ globalApiParams: state.params }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/ui-events" }));
vi.mock("@utils/api", () => ({
  default: (...args: unknown[]) => {
    state.fetch(...args);
    return {
      data: state.data,
      error: state.error,
      isLoading: false,
      mutate: vi.fn(),
    };
  },
}));
const definition: UiEvent = {
  id: "from-database",
  enabled: true,
  route: "/ui-events",
  target: "ui.field",
  trigger: "hover",
  kind: "tooltip",
  title: "Stored help",
  body: "Account scoped content",
  priority: 1,
  provenance: { source: "operator", signal: "field-help" },
};
afterEach(cleanup);
beforeEach(() => {
  state.data = [definition];
  state.error = null;
  state.subject = "user-1";
  vi.clearAllMocks();
});
const page = (
  <UiEventsProvider>
    <input data-ui-target="ui.field" aria-label="Field" />
  </UiEventsProvider>
);

describe("management-backed event source", () => {
  it("renders only validated fetched definitions and disables delivery on fetch failure", async () => {
    const { rerender } = render(page);
    fireEvent.pointerOver(screen.getByLabelText("Field"));
    expect((await screen.findByRole("tooltip")).textContent).toContain(
      "Account scoped content",
    );
    state.error = new Error("Database unavailable");
    rerender(
      <UiEventsProvider>
        <input data-ui-target="ui.field" aria-label="Field" />
      </UiEventsProvider>,
    );
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain(
      "No events are active",
    );
  });
  it("rejects invalid persisted definitions instead of loading fixtures", () => {
    state.data = [{ ...definition, script: "run arbitrary code" }];
    render(page);
    fireEvent.pointerOver(screen.getByLabelText("Field"));
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain(
      "Invalid event definitions",
    );
  });
  it("scopes caches to identity and account and does not retain another scope's data", () => {
    const { rerender } = render(page);
    expect(state.fetch).toHaveBeenLastCalledWith(
      "/ui-events",
      true,
      true,
      true,
      expect.objectContaining({
        key: JSON.stringify({ subject: "user-1", params: state.params }),
        keepPreviousData: false,
      }),
    );
    state.subject = "user-2";
    state.data = undefined;
    rerender(
      <UiEventsProvider>
        <input data-ui-target="ui.field" aria-label="Field" />
      </UiEventsProvider>,
    );
    expect(state.fetch).toHaveBeenLastCalledWith(
      "/ui-events",
      true,
      true,
      true,
      expect.objectContaining({
        key: JSON.stringify({ subject: "user-2", params: state.params }),
        keepPreviousData: false,
      }),
    );
    fireEvent.pointerOver(screen.getByLabelText("Field"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
