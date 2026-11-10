import { type } from "arktype";
import catalogDefinition from "./catalog.json";

const signalDefinitions = catalogDefinition.entries.filter(
  (entry) => entry.kind === "signal",
);

const Identifier = /^[a-z][a-zA-Z0-9._:-]{0,199}$/;
const EvidenceContract = type({
  "+": "reject",
  file: "0 < string <= 1000",
  line: "number.integer > 0",
  column: "number.integer > 0",
});
export const DiscoveryContract = type({
  "+": "reject",
  version: "'mcpl.discovery/1'",
  candidates: type({
    "+": "reject",
    id: "0 < string <= 1200",
    kind: "'control' | 'signal'",
    name: "0 < string <= 200",
    canonical: "0 < string <= 200 | null",
    target: "0 < string <= 200 | null",
    evidence: EvidenceContract,
    unresolved: "0 < string <= 1000 | null",
  }).array(),
});
export type Discovery = typeof DiscoveryContract.infer;

export const CatalogContract = type({
  "+": "reject",
  version: "'mcpl.catalog/1'",
  entries: type({
    "+": "reject",
    id: Identifier,
    kind: "'signal' | 'action' | 'content'",
    aliases: "string[]",
    description: "0 < string <= 1000",
    execution: "'observe' | 'unavailable'",
  }).array(),
});
export type Catalog = typeof CatalogContract.infer;
export type CatalogEntry = Catalog["entries"][number];

export function parseDiscovery(payload: unknown): Discovery {
  const result = DiscoveryContract(payload);
  if (result instanceof type.errors)
    throw new Error(`Invalid MCPL discovery: ${result.summary}`);
  const ids = new Set<string>();
  for (const candidate of result.candidates) {
    if (ids.has(candidate.id))
      throw new Error(`Duplicate MCPL discovery ID: ${candidate.id}`);
    ids.add(candidate.id);
    const file = candidate.evidence.file;
    if (
      file.startsWith("/") ||
      file.includes("\\") ||
      file.split("/").includes("..") ||
      /^[a-zA-Z]:/.test(file)
    )
      throw new Error(
        "MCPL evidence paths must be relative to the scanned root.",
      );
    if (!candidate.target && !candidate.unresolved)
      throw new Error(
        `MCPL candidate lacks a target diagnostic: ${candidate.id}`,
      );
    const definition = signalDefinitions.find((signal) =>
      signal.aliases.includes(candidate.name),
    );
    if (
      candidate.kind === "control"
        ? candidate.canonical !== null
        : candidate.canonical !== (definition?.id ?? null)
    )
      throw new Error(`MCPL signal alias mismatch: ${candidate.id}`);
    if (candidate.kind === "signal" && !definition && !candidate.unresolved)
      throw new Error(
        `MCPL unknown signal lacks a diagnostic: ${candidate.id}`,
      );
  }
  return result;
}

export function parseCatalog(payload: unknown): Catalog {
  const result = CatalogContract(payload);
  if (result instanceof type.errors)
    throw new Error(`Invalid MCPL catalog: ${result.summary}`);
  const names = new Set<string>();
  for (const entry of result.entries) {
    if (entry.kind !== "signal" && entry.execution !== "unavailable")
      throw new Error(`MCPL capability has no executor: ${entry.id}`);
    for (const alias of [entry.id, ...entry.aliases]) {
      if (!alias.trim() || alias !== alias.trim())
        throw new Error(`Invalid MCPL alias for ${entry.id}`);
      const key = `${entry.kind}:${alias}`;
      if (names.has(key)) throw new Error(`Ambiguous MCPL alias: ${key}`);
      names.add(key);
    }
  }
  return result;
}

export function resolveAlias(
  catalog: Catalog,
  kind: CatalogEntry["kind"],
  alias: string,
): CatalogEntry {
  const validated = parseCatalog(catalog);
  const entry = validated.entries.find(
    (candidate) =>
      candidate.kind === kind &&
      (candidate.id === alias || candidate.aliases.includes(alias)),
  );
  if (!entry) throw new Error(`Unknown MCPL ${kind} alias: ${alias}`);
  return entry;
}

export const dashboardCatalog = parseCatalog(catalogDefinition);
