import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  discoverProject,
  discoverSource,
} from "../../../scripts/mcpl-discover.mjs";
import {
  dashboardCatalog,
  parseCatalog,
  parseDiscovery,
  resolveAlias,
} from "./catalog";

describe("MCPL discovery and canonical catalog", () => {
  it("finds real TSX controls and aliases without exporting input values", () => {
    const candidates = discoverSource(
      '<button data-ui-target="peer.save" onClick={save}>Save</button>;\n' +
        '<input id="label" value="private value" onChange={change} />',
      "peer.tsx",
    );
    const report = parseDiscovery({ version: "mcpl.discovery/1", candidates });
    expect(report.candidates).toHaveLength(4);
    expect(report.candidates[1]).toMatchObject({
      kind: "signal",
      canonical: "ui.activate",
      target: "peer.save",
      evidence: { file: "peer.tsx", line: 1 },
    });
    expect(report.candidates[2].target).toBe("input.label");
    expect(JSON.stringify(report)).not.toContain("private value");
  });

  it("does not promote dynamic targets, spreads or custom events to capabilities", () => {
    const candidates = discoverSource(
      "<UiInput eventTarget={target} onChange={change} />;\n" +
        '<button {...props} data-ui-target="save" onClick={save} />;\n' +
        "document.addEventListener(eventName, handler);",
      "dynamic.tsx",
    );
    expect(candidates.every((candidate) => candidate.unresolved)).toBe(true);
    expect(candidates[0].target).toBeNull();
    expect(candidates.at(-1)?.canonical).toBeNull();
  });

  it("rejects malformed source instead of emitting a success-shaped report", () => {
    expect(() => discoverSource("<button", "broken.tsx")).toThrow("broken.tsx");
  });

  it("scans deterministic evidence without evaluating source or including tests", () => {
    const root = mkdtempSync(path.join(tmpdir(), "mcpl-discovery-"));
    try {
      writeFileSync(path.join(root, "b.tsx"), '<button id="save" />');
      writeFileSync(
        path.join(root, "a.ts"),
        'throw new Error("must not run");',
      );
      writeFileSync(path.join(root, "ignored.test.tsx"), "<button />");
      mkdirSync(path.join(root, "dist"));
      writeFileSync(
        path.join(root, "dist", "bundle.js"),
        "not valid source !!!",
      );
      const report = parseDiscovery(discoverProject(root));
      expect(report.candidates).toHaveLength(1);
      expect(report.candidates[0].evidence.file).toBe("b.tsx");
      expect(discoverProject(root)).toEqual(report);
      mkdirSync(path.join(root, "actual"));
      symlinkSync(
        path.join(root, "actual"),
        path.join(root, "linked"),
        "junction",
      );
      expect(() => discoverProject(root)).toThrow("Symlink");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("resolves exact aliases by kind and rejects unknown aliases", () => {
    expect(resolveAlias(dashboardCatalog, "signal", "onClick").id).toBe(
      "ui.activate",
    );
    expect(
      resolveAlias(dashboardCatalog, "action", "type-text").execution,
    ).toBe("unavailable");
    expect(() => resolveAlias(dashboardCatalog, "action", "onClick")).toThrow(
      "Unknown",
    );
    expect(() => resolveAlias(dashboardCatalog, "signal", "onclick")).toThrow(
      "Unknown",
    );
  });

  it("keeps every discovered signal alias aligned with the canonical catalog", () => {
    for (const entry of dashboardCatalog.entries.filter(
      (candidate) => candidate.kind === "signal",
    )) {
      for (const alias of entry.aliases) {
        const source = alias.startsWith("on")
          ? `<button ${alias}={handler} />`
          : `document.addEventListener("${alias}", handler)`;
        const discovered = discoverSource(source, "signals.tsx").find(
          (candidate) => candidate.kind === "signal",
        );
        expect(discovered?.canonical, alias).toBe(entry.id);
      }
    }
  });

  it("rejects ambiguous aliases, canonical collisions and executable claims", () => {
    const entry = dashboardCatalog.entries[0];
    expect(() =>
      parseCatalog({
        ...dashboardCatalog,
        entries: [entry, { ...entry, id: "another" }],
      }),
    ).toThrow("Ambiguous");
    expect(() =>
      parseCatalog({
        ...dashboardCatalog,
        entries: [{ ...entry, aliases: [entry.id] }],
      }),
    ).toThrow("Ambiguous");
    expect(() =>
      parseCatalog({
        ...dashboardCatalog,
        entries: [{ ...entry, kind: "action" }],
      }),
    ).toThrow("no executor");
    expect(() =>
      parseDiscovery({ ...dashboardCatalog, script: "run" }),
    ).toThrow("Invalid MCPL discovery");
  });
});
