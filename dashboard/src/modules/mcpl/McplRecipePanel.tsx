"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { CanonicalButton } from "@/components/canonical/CanonicalButton";
import { CanonicalCard } from "@/components/canonical/CanonicalCard";
import {
  bindRecipe,
  composeRecipe,
  type Composition,
  type ContentFact,
  type LiveSignal,
  parseRecipe,
  type Recipe,
  RecipeJsonSchema,
} from "./recipe";
import { observeDashboardSignals } from "./signals";

export function McplRecipePanel({
  route,
  definitions,
}: {
  route: string;
  definitions: readonly ContentFact[];
}) {
  return (
    <RecipeSession
      key={JSON.stringify([route, definitions])}
      route={route}
      definitions={definitions}
    />
  );
}

function RecipeSession({
  route,
  definitions,
}: {
  route: string;
  definitions: readonly ContentFact[];
}) {
  const [draft, setDraft] = useState("");
  const [active, setActive] = useState<Recipe | null>(null);
  const [records, setRecords] = useState<Composition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastSignal, setLastSignal] = useState<LiveSignal | null>(null);
  const stop = useRef<(() => void) | null>(null);

  const halt = () => {
    stop.current?.();
    stop.current = null;
    setActive(null);
    setRecords([]);
    setLastSignal(null);
  };
  useLayoutEffect(() => {
    return () => {
      stop.current?.();
      stop.current = null;
    };
  }, []);

  const start = () => {
    halt();
    setError(null);
    try {
      const recipe = parseRecipe(JSON.parse(draft));
      bindRecipe(recipe, definitions);
      if (recipe.when.route !== route)
        throw new Error("Open the recipe's route before observing.");
      stop.current = observeDashboardSignals(
        document,
        route,
        (signal) => {
          setLastSignal(signal);
          if (
            signal.id !== recipe.when.signal ||
            signal.target !== recipe.when.target
          )
            return;
          try {
            const result = composeRecipe(recipe, signal, definitions);
            setError(null);
            setRecords((previous) => [result, ...previous].slice(0, 20));
          } catch (failure) {
            halt();
            setError(
              failure instanceof Error
                ? failure.message
                : "MCPL composition failed.",
            );
          }
        },
        setError,
      );
      setActive(recipe);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "MCPL recipe could not be started.",
      );
    }
  };
  const eligible = definitions.filter(
    (event) => event.enabled && event.route === route,
  );

  return (
    <CanonicalCard
      heading="MCPL live recipes"
      subtitle="Pool saved account content with actual dashboard interaction metadata. No control values are collected."
      className="min-w-0"
    >
      <div
        data-ui-registry-inspector
        className="space-y-4 [overflow-wrap:anywhere]"
      >
        <p>
          Select an existing saved event to create a recipe, or paste a recipe
          proposal. Starting observation does not execute actions or save
          changes. Declared operator/AI origin is unverified.
        </p>
        <label className="block">
          Use saved content
          <select
            className="block w-full min-w-0 rounded border bg-nb-gray-900 p-2"
            value=""
            disabled={!!active}
            onChange={(event) => {
              const content = eligible.find(
                (entry) => entry.id === event.target.value,
              );
              if (!content) return;
              setRecords([]);
              setError(null);
              setDraft(
                JSON.stringify(
                  {
                    version: "mcpl.recipe/1",
                    id: "dashboard.context",
                    label: content.title,
                    origin: "operator",
                    when: { signal: "focusin", route, target: content.target },
                    content: { eventId: content.id },
                    output: {
                      title: [{ binding: "content.title" }],
                      body: [
                        { binding: "content.body" },
                        { literal: "\nObserved " },
                        { binding: "signal.id" },
                        { literal: " on " },
                        { binding: "signal.target" },
                      ],
                    },
                  },
                  null,
                  2,
                ),
              );
            }}
          >
            <option value="">
              Select an enabled saved event on this route
            </option>
            {eligible.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </label>
        {eligible.length === 0 && (
          <p>
            Save an enabled account event for a real target on this route first.
            No fixture content is substituted.
          </p>
        )}
        <label className="block">
          MCPL recipe JSON
          <textarea
            className="block min-h-48 w-full min-w-0 rounded border bg-transparent p-2 font-mono"
            maxLength={64000}
            value={draft}
            disabled={!!active}
            onChange={(event) => {
              setDraft(event.target.value);
              setRecords([]);
              setError(null);
            }}
          />
        </label>
        <details>
          <summary className="cursor-pointer">
            Machine-readable recipe schema
          </summary>
          <label className="block">
            JSON Schema for MCPL recipes
            <textarea
              readOnly
              className="block min-h-48 w-full min-w-0 rounded border bg-transparent p-2 font-mono"
              value={JSON.stringify(RecipeJsonSchema, null, 2)}
            />
          </label>
          <p>
            Generated from the same ArkType contract. Runtime catalog resolution
            and current-account content checks are still required.
          </p>
        </details>
        <div className="flex flex-wrap gap-2">
          <CanonicalButton disabled={!!active || !draft} onClick={start}>
            Start observing recipe
          </CanonicalButton>
          <CanonicalButton disabled={!active} onClick={halt}>
            Stop and clear
          </CanonicalButton>
        </div>
        <p role="status">
          {active
            ? `Observing ${active.label}. Interact with its real target outside this panel.`
            : "Observation stopped."}
        </p>
        {error && <p role="alert">{error}</p>}
        {lastSignal && (
          <p className="break-all">
            Last native signal: {lastSignal.id} on {lastSignal.target}.
          </p>
        )}
        <div
          className="space-y-3"
          aria-label="Composed MCPL content"
          aria-live="polite"
        >
          {records.map((record, index) => (
            <article
              key={`${record.signal.timestamp}:${index}`}
              className="rounded border p-3"
            >
              <h4>{record.title}</h4>
              <p className="whitespace-pre-wrap break-words">{record.body}</p>
              <p className="break-all text-xs">
                Content: {record.content.id} from {record.content.source}.
                Recipe: {record.recipe.id}, declared {record.recipe.origin}{" "}
                (unverified).
              </p>
            </article>
          ))}
        </div>
        <p className="text-sm">
          At most 20 compositions are held in memory. Stop, route changes,
          account changes, changed content and leaving the page clear them. This
          is data composition, not cursor/typing or tool execution.
        </p>
      </div>
    </CanonicalCard>
  );
}
