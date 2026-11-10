import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CanonicalButton } from "./CanonicalButton";
import { CanonicalCard } from "./CanonicalCard";

afterEach(cleanup);

describe("CanonicalButton", () => {
  it("supports icon-only a11y labels", () => {
    render(
      <CanonicalButton iconOnly aria-label="Open assistant">
        <span>•</span>
      </CanonicalButton>,
    );

    expect(screen.getByRole("button", { name: "Open assistant" })).toBeTruthy();
  });
});

describe("CanonicalCard", () => {
  it("renders heading and content with section semantics", () => {
    render(<CanonicalCard heading="Scale foundation">Body</CanonicalCard>);

    expect(
      screen.getByRole("heading", { name: "Scale foundation" }),
    ).toBeTruthy();
    expect(screen.getByText("Body")).toBeTruthy();
  });
});
