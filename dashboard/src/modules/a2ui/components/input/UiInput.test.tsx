import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Input } from "@/components/Input";
import { UiInput } from "./UiInput";

afterEach(cleanup);

describe("UiInput compatibility and canonical identity", () => {
  it("keeps legacy imports on the same component and preserves controlled behavior", () => {
    expect(Input).toBe(UiInput);
    const changed = vi.fn();
    render(
      <>
        <label htmlFor="value">Value</label>
        <UiInput
          id="value"
          eventTarget="ui.test.value"
          value="original"
          onChange={changed}
        />
      </>,
    );
    const input = screen.getByLabelText<HTMLInputElement>("Value");
    fireEvent.change(input, { target: { value: "updated" } });
    expect(changed).toHaveBeenCalledOnce();
    expect(input.dataset.uiTarget).toBe("ui.test.value");
    expect(input.dataset.uiComponent).toBe("input");
  });
  it("preserves password visibility and error state", () => {
    render(
      <UiInput
        aria-label="Password"
        type="password"
        showPasswordToggle
        error="Invalid password"
      />,
    );
    const input = screen.getByLabelText<HTMLInputElement>("Password");
    expect(input.type).toBe("password");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    fireEvent.click(
      screen.getByRole("button", { name: "Toggle password visibility" }),
    );
    expect(input.type).toBe("text");
    expect(screen.getByText("Invalid password")).toBeTruthy();
  });
});
