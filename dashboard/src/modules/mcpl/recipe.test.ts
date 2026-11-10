import { describe, expect, it } from "vitest";
import {
  composeRecipe,
  type ContentFact,
  parseRecipe,
  RecipeJsonSchema,
} from "./recipe";

const content: ContentFact = {
  id: "saved-help",
  enabled: true,
  route: "/ui-events",
  target: "ui.editor.title",
  title: "Configure help",
  body: "This content came from the account store.",
  provenance: { source: "operator", signal: "context-help" },
};
const recipe = {
  version: "mcpl.recipe/1",
  id: "context.help",
  label: "Editing help",
  origin: "operator",
  when: { signal: "onFocus", target: content.target, route: content.route },
  content: { eventId: content.id },
  output: {
    title: [{ binding: "content.title" }],
    body: [
      { binding: "content.body" },
      { literal: " / " },
      { binding: "signal.id" },
      { literal: " / " },
      { binding: "signal.target" },
    ],
  },
};
const signal = {
  id: "ui.focus",
  route: content.route,
  target: content.target,
  timestamp: 100,
};

describe("MCPL typed composition", () => {
  it("exports the actual contract as a strict machine-readable JSON Schema", () => {
    expect(RecipeJsonSchema).toMatchObject({
      type: "object",
      additionalProperties: false,
      properties: {
        version: { const: "mcpl.recipe/1" },
        when: { type: "object", additionalProperties: false },
        output: {
          properties: {
            body: { type: "array", minItems: 1, maxItems: 16 },
          },
        },
      },
    });
  });
  it.each(["operator", "ai-proposal"])(
    "pools actual supplied content and signal metadata for declared %s proposals",
    (origin) => {
      const result = composeRecipe({ ...recipe, origin }, signal, [content]);
      expect(result.title).toBe(content.title);
      expect(result.body).toBe(
        `${content.body} / ui.focus / ${content.target}`,
      );
      expect(result.content).toEqual({
        id: content.id,
        source: "authenticated-management",
        declaredProvenance: content.provenance,
      });
      expect(result.recipe).toMatchObject({ origin, originVerified: false });
      expect(result.signal.timestamp).toBe(100);
    },
  );

  it("normalizes exact signal aliases and rejects unknown actions and bindings", () => {
    expect(parseRecipe(recipe).when.signal).toBe("ui.focus");
    for (const payload of [
      { ...recipe, when: { ...recipe.when, signal: "execute" } },
      { ...recipe, script: "document.querySelector('button').click()" },
      { ...recipe, approval: true },
      { ...recipe, accountId: "other-account" },
      {
        ...recipe,
        output: { ...recipe.output, body: [{ binding: "signal.value" }] },
      },
      {
        ...recipe,
        output: { ...recipe.output, body: [{ binding: "__proto__" }] },
      },
      { ...recipe, output: { ...recipe.output, title: [] } },
    ])
      expect(() => parseRecipe(payload)).toThrow();
  });

  it("fails closed for missing, ambiguous, disabled or differently scoped content", () => {
    for (const definitions of [
      [],
      [content, content],
      [{ ...content, enabled: false }],
      [{ ...content, route: "/other" }],
      [{ ...content, target: "other.target" }],
    ])
      expect(() => composeRecipe(recipe, signal, definitions)).toThrow();
  });

  it("does not accept mismatching signals or collect event values", () => {
    for (const payload of [
      { ...signal, id: "ui.change" },
      { ...signal, target: "other" },
      { ...signal, route: "/other" },
      { ...signal, value: "private input" },
    ])
      expect(() => composeRecipe(recipe, payload, [content])).toThrow();
  });

  it("treats content as text, preserves declared provenance and bounds output", () => {
    const markup = "<script>throw new Error('never evaluated')</script>";
    expect(
      composeRecipe(recipe, signal, [{ ...content, body: markup }]).body,
    ).toContain(markup);
    expect(() =>
      composeRecipe(
        {
          ...recipe,
          output: {
            ...recipe.output,
            body: Array.from({ length: 10 }, () => ({
              binding: "content.body",
            })),
          },
        },
        signal,
        [{ ...content, body: "x".repeat(1000) }],
      ),
    ).toThrow("8000");
  });
});
