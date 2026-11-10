import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { McplCatalogPanel } from "./McplCatalogPanel";

afterEach(cleanup);

const report = {
  version: "mcpl.discovery/1",
  candidates: [
    {
      id: "peer.tsx:1:1:signal",
      kind: "signal",
      name: "onClick",
      canonical: "ui.activate",
      target: "peer.save",
      evidence: { file: "peer.tsx", line: 1, column: 1 },
      unresolved: null,
    },
  ],
};
const upload = (payload: unknown) => {
  const file = new File([JSON.stringify(payload)], "discovery.json");
  Object.defineProperty(file, "text", {
    value: async () => JSON.stringify(payload),
  });
  fireEvent.change(screen.getByLabelText(/Inspect a local MCPL/), {
    target: { files: [file] },
  });
};

describe("MCPL inventory", () => {
  it("shows imported source evidence and live identity without granting execution", async () => {
    render(
      <McplCatalogPanel
        targets={[
          {
            key: "save",
            target: "peer.save",
            disabled: false,
            ambiguous: false,
          },
        ]}
      />,
    );
    upload(report);
    expect(await screen.findByText("peer.tsx:1:1")).toBeTruthy();
    expect(screen.getByText(/Identity matches a mounted target/)).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "nonexistent" },
    });
    expect(screen.queryByText("peer.tsx:1:1")).toBeNull();
    expect(screen.getByText(/0 matches/)).toBeTruthy();
  });

  it("clears previous evidence and reports malformed or misrepresented signals", async () => {
    render(<McplCatalogPanel targets={[]} />);
    upload(report);
    await screen.findByText("peer.tsx:1:1");
    upload({
      ...report,
      candidates: [{ ...report.candidates[0], canonical: "ui.submit" }],
    });
    expect((await screen.findByRole("alert")).textContent).toContain(
      "signal alias mismatch",
    );
    expect(screen.queryByText("peer.tsx:1:1")).toBeNull();
  });
});
