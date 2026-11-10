import { type } from "arktype";
import { dashboardCatalog, resolveAlias } from "./catalog";

const Target = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,199}$/;
const Route = /^\/[^\s?#]*$/;
const Part = type({
  "+": "reject",
  literal: "0 < string <= 1000",
}).or({
  "+": "reject",
  binding:
    "'content.title' | 'content.body' | 'signal.id' | 'signal.target' | 'recipe.label'",
});

export const RecipeContract = type({
  "+": "reject",
  version: "'mcpl.recipe/1'",
  id: /^[a-z][a-zA-Z0-9._:-]{0,199}$/,
  label: "0 < string <= 200",
  origin: "'operator' | 'ai-proposal'",
  when: {
    "+": "reject",
    signal: "0 < string <= 200",
    target: Target,
    route: Route,
  },
  content: {
    "+": "reject",
    eventId: "0 < string <= 200",
  },
  output: {
    "+": "reject",
    title: Part.array().atLeastLength(1).atMostLength(16),
    body: Part.array().atLeastLength(1).atMostLength(16),
  },
});
export type Recipe = typeof RecipeContract.infer;
export const RecipeJsonSchema = RecipeContract.toJsonSchema();

export const LiveSignalContract = type({
  "+": "reject",
  id: "0 < string <= 200",
  target: Target,
  route: Route,
  timestamp: "number.integer >= 0",
});
export type LiveSignal = typeof LiveSignalContract.infer;

export interface ContentFact {
  id: string;
  enabled: boolean;
  route: string;
  target: string;
  title: string;
  body: string;
  provenance: { source: string; signal: string };
}

const observedSignals = new Set([
  "ui.activate",
  "ui.focus",
  "ui.hover",
  "ui.input",
  "ui.change",
  "ui.submit",
]);

export function parseRecipe(payload: unknown): Recipe {
  const parsed = RecipeContract(payload);
  if (parsed instanceof type.errors)
    throw new Error(`Invalid MCPL recipe: ${parsed.summary}`);
  const signal = resolveAlias(
    dashboardCatalog,
    "signal",
    parsed.when.signal,
  ).id;
  if (!observedSignals.has(signal))
    throw new Error(`MCPL signal adapter is unavailable: ${signal}`);
  return { ...parsed, when: { ...parsed.when, signal } };
}

export function bindRecipe(
  recipe: Recipe,
  definitions: readonly ContentFact[],
): ContentFact {
  const matches = definitions.filter(
    (event) => event.id === recipe.content.eventId,
  );
  if (matches.length !== 1)
    throw new Error(
      "Recipe requires exactly one current-account saved content definition.",
    );
  const content = matches[0];
  if (
    !content.enabled ||
    content.route !== recipe.when.route ||
    content.target !== recipe.when.target
  )
    throw new Error(
      "Recipe content is disabled or its route/target does not match.",
    );
  return content;
}

export function composeRecipe(
  payload: unknown,
  signalPayload: unknown,
  definitions: readonly ContentFact[],
) {
  const recipe = parseRecipe(payload);
  const signal = LiveSignalContract(signalPayload);
  if (signal instanceof type.errors)
    throw new Error(`Invalid MCPL signal: ${signal.summary}`);
  const content = bindRecipe(recipe, definitions);
  if (
    signal.id !== recipe.when.signal ||
    signal.target !== recipe.when.target ||
    signal.route !== recipe.when.route
  )
    throw new Error("Live signal does not match this recipe.");
  const bindings = {
    "content.title": content.title,
    "content.body": content.body,
    "signal.id": signal.id,
    "signal.target": signal.target,
    "recipe.label": recipe.label,
  };
  const render = (parts: Recipe["output"]["body"]) => {
    const text = parts
      .map((part) =>
        "literal" in part ? part.literal : bindings[part.binding],
      )
      .join("");
    if (text.length > 8000)
      throw new Error("MCPL composed text exceeds 8000 characters.");
    return text;
  };
  return {
    version: "mcpl.composition/1",
    recipe: { id: recipe.id, origin: recipe.origin, originVerified: false },
    signal,
    content: {
      id: content.id,
      source: "authenticated-management",
      declaredProvenance: { ...content.provenance },
    },
    title: render(recipe.output.title),
    body: render(recipe.output.body),
  };
}

export type Composition = ReturnType<typeof composeRecipe>;
