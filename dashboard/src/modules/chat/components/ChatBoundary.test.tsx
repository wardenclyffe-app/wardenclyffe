import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChatBoundary } from "./ChatBoundary";

afterEach(cleanup);

describe("ChatBoundary", () => {
  it("docks bottom right and supports minimize, close, reopen, and Escape", () => {
    render(
      <ChatBoundary>
        <p>Conversation area</p>
      </ChatBoundary>,
    );
    expect(
      screen.getByRole("dialog", { name: "Clyffy Chat" }).className,
    ).toContain("bottom-");
    expect(screen.getByRole("dialog").className).toContain("right-");
    fireEvent.click(screen.getByRole("button", { name: "Minimize chat" }));
    expect(screen.queryByText("Conversation area")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Expand chat" }));
    expect(screen.getByText("Conversation area")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close chat" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Open Clyffy chat" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Open Clyffy chat" }));
    expect(screen.getByText("Conversation area")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
