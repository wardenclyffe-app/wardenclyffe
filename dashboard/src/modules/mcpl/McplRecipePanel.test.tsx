import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { McplRecipePanel } from "./McplRecipePanel";

afterEach(cleanup);
const content = {
  id: "saved",
  enabled: true,
  title: "Account help",
  body: "Saved account content",
  route: "/ui-events",
  target: "ui.field",
  provenance: { source: "operator", signal: "context-help" },
};

describe("MCPL recipe observation controls", () => {
  it("creates a real content-bound recipe and stops on content refresh", () => {
    const { rerender } = render(
      <McplRecipePanel route="/ui-events" definitions={[content]} />,
    );
    fireEvent.change(screen.getByLabelText("Use saved content"), {
      target: { value: content.id },
    });
    const draft =
      screen.getByLabelText<HTMLTextAreaElement>("MCPL recipe JSON");
    expect(JSON.parse(draft.value).content.eventId).toBe("saved");
    fireEvent.click(
      screen.getByRole("button", { name: "Start observing recipe" }),
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Observing Account help",
    );
    expect(draft.disabled).toBe(true);
    rerender(
      <McplRecipePanel route="/ui-events" definitions={[{ ...content }]} />,
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Observing Account help",
    );
    rerender(<McplRecipePanel route="/ui-events" definitions={[]} />);
    expect(screen.getByRole("status").textContent).toBe("Observation stopped.");
    expect(
      screen.getByLabelText<HTMLTextAreaElement>("MCPL recipe JSON").disabled,
    ).toBe(false);
    expect(
      screen.getByLabelText<HTMLTextAreaElement>("MCPL recipe JSON").value,
    ).toBe("");
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("reports invalid proposals and never substitutes fixture data", () => {
    render(<McplRecipePanel route="/ui-events" definitions={[]} />);
    expect(screen.getByText(/No fixture content/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("MCPL recipe JSON"), {
      target: { value: '{"version":"mcpl.recipe/1","script":"execute"}' },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Start observing recipe" }),
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Invalid MCPL recipe",
    );
    expect(screen.getByRole("status").textContent).toBe("Observation stopped.");
  });

  it("clears observation on explicit stop and route changes", () => {
    const definitions = [content];
    const { rerender } = render(
      <McplRecipePanel route="/ui-events" definitions={definitions} />,
    );
    fireEvent.change(screen.getByLabelText("Use saved content"), {
      target: { value: "saved" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Start observing recipe" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Stop and clear" }));
    expect(screen.getByRole("status").textContent).toBe("Observation stopped.");
    fireEvent.click(
      screen.getByRole("button", { name: "Start observing recipe" }),
    );
    rerender(<McplRecipePanel route="/other" definitions={definitions} />);
    expect(screen.getByRole("status").textContent).toBe("Observation stopped.");
  });
});
