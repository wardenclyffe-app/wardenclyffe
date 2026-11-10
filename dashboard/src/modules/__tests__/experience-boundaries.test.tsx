import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { type } from "arktype";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ChatAdminPanel } from "../chat/admin/ChatAdminPanel";
import { ChatProvider } from "../chat/ChatProvider";
import { ChatOverlay } from "../chat/components/ChatOverlay";
import { ChatMessageContract } from "../chat/contracts";
import { MCPAdminPanel } from "../mcp/admin/MCPAdminPanel";
import { ScriptedEventsAdminPanel } from "../scripted-events/admin/ScriptedEventsAdminPanel";
import { ScriptedEventsSurface } from "../scripted-events/components/ScriptedEventsSurface";
import { defaultScriptedEvents } from "../scripted-events/defaults";
import { ScriptedEventsProvider } from "../scripted-events/ScriptedEventsProvider";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const renderBoundaries = (canUpdate = true) =>
  render(
    <ChatProvider>
      <ScriptedEventsProvider>
        <ChatOverlay />
        <ScriptedEventsSurface />
        <ChatAdminPanel canUpdate={canUpdate} />
        <ScriptedEventsAdminPanel canUpdate={canUpdate} />
        <MCPAdminPanel />
      </ScriptedEventsProvider>
    </ChatProvider>,
  );

describe("independent chat, event, and MCP boundaries", () => {
  it("keeps event content out of chat and keeps controls independent", () => {
    renderBoundaries();
    const chat = screen.getByRole("dialog", { name: "Clyffy Chat" });
    expect(within(chat).queryByText(/Use the left frame/)).toBeNull();
    expect(
      within(chat).getByRole<HTMLTextAreaElement>("textbox", {
        name: "Message Clyffy",
      }).disabled,
    ).toBe(true);
    const events = screen.getByRole("complementary", {
      name: "Scripted knowledge events",
    });
    expect(within(events).getByText(/Use the left frame/)).toBeTruthy();
    expect(within(chat).queryByText(/Background-only/)).toBeNull();
    fireEvent.click(screen.getByLabelText("Show Clyffy chat"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByRole("complementary", { name: "Scripted knowledge events" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Show Clyffy chat"));
    fireEvent.click(screen.getByLabelText("Enable clyffy-welcome-tooltip"));
    expect(screen.getByRole("dialog", { name: "Clyffy Chat" })).toBeTruthy();
    expect(
      screen.getByText(
        "No MCP transport or connection-management backend is configured.",
      ),
    ).toBeTruthy();
  });

  it("preserves saved chat settings without overwriting event settings", () => {
    localStorage.setItem(
      "wardenclyffe-chat-preferences-v1",
      '{"enabled":false}',
    );
    renderBoundaries();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      JSON.parse(localStorage.getItem("wardenclyffe-chat-preferences-v1")!),
    ).toEqual({ enabled: false });
    expect(
      screen.getByRole("complementary", { name: "Scripted knowledge events" }),
    ).toBeTruthy();
  });

  it("never surfaces background events even when inventory includes them", () => {
    localStorage.setItem(
      "wardenclyffe-scripted-events-v1",
      JSON.stringify(
        defaultScriptedEvents.filter(
          (event) => event.visibility === "background",
        ),
      ),
    );
    renderBoundaries();
    fireEvent.click(screen.getByLabelText("Include background sink lane"));
    expect(
      screen.queryByRole("complementary", {
        name: "Scripted knowledge events",
      }),
    ).toBeNull();
    expect(screen.getByRole("dialog", { name: "Clyffy Chat" })).toBeTruthy();
  });

  it("denies settings edits for read-only roles", () => {
    renderBoundaries(false);
    expect(
      screen.getByLabelText<HTMLInputElement>("Show Clyffy chat").disabled,
    ).toBe(true);
    expect(
      screen.getByLabelText<HTMLInputElement>("Enable clyffy-welcome-tooltip")
        .disabled,
    ).toBe(true);
  });

  it("rejects event and tool payloads as chat messages", () => {
    expect(ChatMessageContract(defaultScriptedEvents[0])).toBeInstanceOf(
      type.errors,
    );
    expect(
      ChatMessageContract({ requestId: "tool-1", events: [] }),
    ).toBeInstanceOf(type.errors);
    expect(
      ChatMessageContract({ id: "message-1", role: "user", text: "Hello" }),
    ).not.toBeInstanceOf(type.errors);
  });
});
