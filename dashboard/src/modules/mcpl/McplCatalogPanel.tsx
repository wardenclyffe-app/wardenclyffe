"use client";

import { useId, useRef, useState } from "react";
import { CanonicalCard } from "@/components/canonical/CanonicalCard";
import { dashboardCatalog, type Discovery, parseDiscovery } from "./catalog";

interface RuntimeTarget {
  key: string;
  target: string | null;
  disabled: boolean;
  ambiguous: boolean;
}

export function McplCatalogPanel({ targets }: { targets: RuntimeTarget[] }) {
  const inputId = useId();
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const [filter, setFilter] = useState("");
  const matches = discovery?.candidates.filter((candidate) =>
    [
      candidate.name,
      candidate.canonical,
      candidate.target,
      candidate.evidence.file,
    ]
      .join(" ")
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  return (
    <CanonicalCard
      className="min-w-0"
      heading="MCPL discovery and catalog"
      subtitle="Source evidence and live target inventory. Discovery never grants execution."
    >
      <div data-ui-registry-inspector className="space-y-4">
        <p>
          Source scan, canonical aliases, runtime verification, then future
          approved execution. Discovery never moves the cursor or types. The
          separate live recipe panel can observe native signals and compose
          text.
        </p>
        <details>
          <summary className="cursor-pointer">Canonical alias catalog</summary>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                MCPL canonical alias definitions
              </caption>
              <thead>
                <tr>
                  <th scope="col">Canonical ID</th>
                  <th scope="col">Kind</th>
                  <th scope="col">Aliases</th>
                  <th scope="col">Execution</th>
                </tr>
              </thead>
              <tbody>
                {dashboardCatalog.entries.map((entry) => (
                  <tr key={`${entry.kind}:${entry.id}`}>
                    <th scope="row" className="p-2">
                      {entry.id}
                    </th>
                    <td className="p-2">{entry.kind}</td>
                    <td className="p-2">{entry.aliases.join(", ")}</td>
                    <td className="p-2">
                      {entry.kind === "signal"
                        ? "Native observer available"
                        : "No MCPL executor"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <label htmlFor={inputId} className="block">
          Inspect a local MCPL discovery JSON report (maximum 5 MB)
        </label>
        <input
          id={inputId}
          type="file"
          accept=".json,application/json"
          className="block w-full min-w-0 max-w-full"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            const current = ++generation.current;
            setDiscovery(null);
            setError(null);
            try {
              if (file.size > 5 * 1024 * 1024)
                throw new Error("Discovery report exceeds 5 MB.");
              const parsed = parseDiscovery(JSON.parse(await file.text()));
              if (generation.current === current) setDiscovery(parsed);
            } catch (failure) {
              if (generation.current === current)
                setError(
                  failure instanceof Error
                    ? failure.message
                    : "Discovery report could not be read.",
                );
            }
          }}
        />
        <p className="text-sm">
          Read locally, not uploaded or persisted. Generate with{" "}
          <code className="break-all">
            npm run mcpl:scan -- src --output mcpl-discovery.json
          </code>{" "}
          from the dashboard directory. No field values or handler bodies are
          collected.
        </p>
        {error && <p role="alert">{error}</p>}
        {discovery && (
          <>
            <p role="status">
              {discovery.candidates.length} candidates;{" "}
              {
                discovery.candidates.filter((candidate) => candidate.unresolved)
                  .length
              }{" "}
              unresolved. No candidate is authorized to execute.
            </p>
            <label className="flex flex-wrap gap-2">
              Filter discovery evidence
              <input
                type="search"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="w-full min-w-0 rounded border bg-transparent p-2"
              />
            </label>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Discovered MCPL candidates
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Candidate</th>
                    <th scope="col">Canonical signal / target</th>
                    <th scope="col">Source evidence</th>
                    <th scope="col">Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {matches?.slice(0, 100).map((candidate) => {
                    const live = targets.filter(
                      (target) =>
                        target.target && target.target === candidate.target,
                    );
                    return (
                      <tr key={candidate.id}>
                        <th scope="row" className="p-2">
                          {candidate.kind}: {candidate.name}
                        </th>
                        <td className="p-2">
                          {candidate.canonical ?? "No canonical signal"} /{" "}
                          {candidate.target ?? "No stable target"}
                        </td>
                        <td className="break-all p-2">
                          {candidate.evidence.file}:{candidate.evidence.line}:
                          {candidate.evidence.column}
                        </td>
                        <td className="p-2">
                          {candidate.unresolved ??
                            "Literal syntax evidence; runtime verification required."}{" "}
                          {live.length === 0
                            ? "Not mounted on this page."
                            : live.length !== 1 ||
                              live.some((target) => target.ambiguous)
                            ? "Ambiguous live identity."
                            : live[0].disabled
                            ? "Live target is disabled."
                            : "Identity matches a mounted target, not authorization."}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p>
              {matches?.length} matches. Showing at most 100 rows; filter to
              narrow.
            </p>
          </>
        )}
      </div>
    </CanonicalCard>
  );
}
