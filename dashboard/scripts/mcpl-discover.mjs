import {
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import catalogDefinition from "../src/modules/mcpl/catalog.json" with { type: "json" };

const signals = new Map(
  catalogDefinition.entries
    .filter((entry) => entry.kind === "signal")
    .flatMap(({ id, aliases }) => aliases.map((alias) => [alias, id])),
);
const controls = new Set(["input", "textarea", "select", "button"]);
const ignored = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  "__tests__",
  "dist",
  "build",
  "out",
  "coverage",
]);

const literal = (node) => {
  if (!node) return null;
  if (ts.isJsxExpression(node)) return literal(node.expression);
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    ? node.text
    : null;
};

/** Discover syntax evidence only. No project modules are imported or executed. */
export function discoverSource(text, file) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const syntaxErrors = source.parseDiagnostics;
  if (syntaxErrors.length)
    throw new Error(
      `${file}: ${syntaxErrors
        .map((error) => ts.flattenDiagnosticMessageText(error.messageText, " "))
        .join("; ")}`,
    );
  const candidates = [];
  const add = (node, kind, name, canonical, target, reason = null) => {
    const position = source.getLineAndCharacterOfPosition(
      node.getStart(source),
    );
    candidates.push({
      id: `${file}:${position.line + 1}:${position.character + 1}:${kind}`,
      kind,
      name,
      canonical,
      target,
      evidence: {
        file,
        line: position.line + 1,
        column: position.character + 1,
      },
      unresolved: reason,
    });
  };
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
      const attribute = (name) =>
        attributes.find((entry) => entry.name.getText(source) === name);
      const tag = node.tagName.getText(source);
      const identity =
        attribute("data-ui-target") ??
        attribute("eventTarget") ??
        attribute("id") ??
        attribute("name");
      const handlers = attributes.filter((entry) =>
        /^on[A-Z]/.test(entry.name.getText(source)),
      );
      if (controls.has(tag) || identity || handlers.length) {
        const value = literal(identity?.initializer);
        const nativeFallback =
          identity &&
          ["id", "name"].includes(identity.name.getText(source)) &&
          controls.has(tag);
        const target = value
          ? nativeFallback
            ? `${tag}.${value}`
            : identity &&
              ["data-ui-target", "eventTarget"].includes(
                identity.name.getText(source),
              )
            ? value
            : null
          : null;
        const spread = node.attributes.properties.some(ts.isJsxSpreadAttribute);
        const reason = spread
          ? "Spread attributes require runtime verification."
          : target
          ? null
          : identity
          ? "Dynamic or component-owned identity requires runtime verification."
          : "No stable target is declared.";
        add(node, "control", tag, null, target, reason);
        for (const handler of handlers) {
          const name = handler.name.getText(source);
          const canonical = signals.get(name) ?? null;
          add(
            handler,
            "signal",
            name,
            canonical,
            target,
            canonical ? reason : "Signal alias is not registered.",
          );
        }
      }
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "addEventListener"
    ) {
      const name = literal(node.arguments[0]);
      add(
        node,
        "signal",
        name ?? "dynamic-event",
        name ? signals.get(name) ?? null : null,
        null,
        name
          ? "Listener receiver and target require runtime verification."
          : "Dynamic event name cannot be resolved statically.",
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return candidates;
}

export function discoverProject(root) {
  const resolved = realpathSync(root);
  const candidates = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort(
      (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
    )) {
      if (entry.isSymbolicLink())
        throw new Error(`Symlink is outside discovery scope: ${entry.name}`);
      if (ignored.has(entry.name)) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (
        /\.[cm]?[jt]sx?$/.test(entry.name) &&
        !/\.(test|spec|d)\.[cm]?[jt]sx?$/.test(entry.name)
      ) {
        const relative = path
          .relative(resolved, file)
          .split(path.sep)
          .join("/");
        candidates.push(
          ...discoverSource(readFileSync(file, "utf8"), relative),
        );
      }
    }
  };
  walk(resolved);
  return { version: "mcpl.discovery/1", candidates };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const args = process.argv.slice(2);
    const outputIndex = args.indexOf("--output");
    const output = outputIndex >= 0 ? args[outputIndex + 1] : null;
    if (outputIndex >= 0) {
      if (!output || output.startsWith("--"))
        throw new Error("--output requires a filename.");
      args.splice(outputIndex, 2);
    }
    if (
      args.length > 1 ||
      (args[0]?.startsWith("--") && args[0] !== "--catalog")
    )
      throw new Error(
        "Usage: node scripts\\mcpl-discover.mjs [source-directory | --catalog] [--output filename]",
      );
    const json = `${JSON.stringify(
      args[0] === "--catalog"
        ? catalogDefinition
        : discoverProject(args[0] ?? "src"),
      null,
      2,
    )}\n`;
    if (output) writeFileSync(output, json, "utf8");
    else process.stdout.write(json);
  } catch (error) {
    process.stderr.write(
      `MCPL discovery failed: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    );
    process.exitCode = 1;
  }
}
