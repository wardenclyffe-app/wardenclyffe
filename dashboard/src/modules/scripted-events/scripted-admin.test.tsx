import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ScriptedEventsAdminPanel } from "./admin/ScriptedEventsAdminPanel";
import { ScriptedEventsProvider } from "./ScriptedEventsProvider";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("ScriptedEventsAdminPanel", () => {
  it("renders lane controls and event toggles", () => {
    render(
      <ScriptedEventsProvider>
        <ScriptedEventsAdminPanel canUpdate />
      </ScriptedEventsProvider>,
    );

    expect(screen.getByText("Scripted Event Control Plane")).toBeTruthy();
    const laneCheckbox = screen.getByLabelText("Show Clyffy visible lane");
    fireEvent.click(laneCheckbox);
    expect((laneCheckbox as HTMLInputElement).checked).toBe(false);

    const eventToggle = screen.getByLabelText("Enable clyffy-welcome-tooltip");
    fireEvent.click(eventToggle);
    expect((eventToggle as HTMLInputElement).checked).toBe(false);
  });
  it("denies edits without update permission", () => {
    render(
      <ScriptedEventsProvider>
        <ScriptedEventsAdminPanel />
      </ScriptedEventsProvider>,
    );
    const checkbox = screen.getByLabelText<HTMLInputElement>(
      "Show Clyffy visible lane",
    );
    expect(checkbox.disabled).toBe(true);
    const toggle = screen.getByLabelText<HTMLInputElement>(
      "Enable clyffy-welcome-tooltip",
    );
    expect(toggle.disabled).toBe(true);
  });
});
