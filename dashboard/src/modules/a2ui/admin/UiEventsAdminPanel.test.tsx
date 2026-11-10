import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UiEventRuntimeProvider } from "../runtime/UiEventRuntimeProvider";
import { UiEventsAdminPanel } from "./UiEventsAdminPanel";

const transport = vi.hoisted(() => ({
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/ui-events" }));
vi.mock("@utils/api", () => ({ useApiCall: () => transport }));
vi.mock("../data/UiEventsProvider", () => ({
  useUiEventsData: () => ({
    loading: false,
    error: null,
    refresh: transport.refresh,
  }),
}));
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const mount = (canUpdate = true) =>
  render(
    <UiEventRuntimeProvider definitions={[]}>
      <UiEventsAdminPanel canUpdate={canUpdate} />
    </UiEventRuntimeProvider>,
  );
const fill = () => {
  fireEvent.change(screen.getByLabelText("Canonical target"), {
    target: { value: "ui.gallery.name" },
  });
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "Name guidance" },
  });
  fireEvent.change(screen.getByLabelText("Plain-text content"), {
    target: { value: "Choose a display name." },
  });
};
describe("database event editing", () => {
  it("saves a validated definition to management and reloads persisted definitions", async () => {
    transport.post.mockImplementation(async (request) => ({
      ...request,
      id: "saved-1",
    }));
    mount();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Save event" }));
    await waitFor(() =>
      expect(screen.getByText("Event saved to management.")).toBeTruthy(),
    );
    expect(transport.post).toHaveBeenCalledWith(
      expect.objectContaining({
        route: "/ui-events",
        target: "ui.gallery.name",
        body: "Choose a display name.",
        kind: "tooltip",
      }),
    );
    expect(transport.refresh).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Delete event" })).toBeTruthy(),
    );
  });
  it("surfaces failed writes instead of claiming success", async () => {
    transport.post.mockRejectedValue(new Error("Management unavailable"));
    mount();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Save event" }));
    await waitFor(() =>
      expect(screen.getByText("Management unavailable")).toBeTruthy(),
    );
    expect(screen.queryByText("Event saved to management.")).toBeNull();
    expect(transport.refresh).not.toHaveBeenCalled();
  });
  it("denies writes for read-only users", () => {
    mount(false);
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Save event" })
        .disabled,
    ).toBe(true);
    expect(
      screen.getByLabelText<HTMLInputElement>("Canonical target").disabled,
    ).toBe(true);
    expect(transport.post).not.toHaveBeenCalled();
  });
  it("does not recursively inventory its own inspector buttons", async () => {
    mount();
    await waitFor(() =>
      expect(screen.getByText(/controls ·/).textContent).toMatch(
        /^1[0-9] controls/,
      ),
    );
    expect(
      screen.getAllByRole("button", { name: "Configure target event" }).length,
    ).toBeLessThan(20);
  });
});
