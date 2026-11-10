import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { preProcessFile } from "typescript";
import { describe, expect, it } from "vitest";

const modules = path.resolve(process.cwd(), "src", "modules");
const sourceFiles = (folder: string): string[] =>
  readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file) ? [file] : [];
  });

describe("module ownership boundaries", () => {
  it.each([
    ["chat", ["mcp", "scripted-events"]],
    ["scripted-events", ["chat", "mcp"]],
    ["mcp", ["chat"]],
    ["a2ui", ["chat", "mcp"]],
    ["mcpl", ["chat", "mcp"]],
  ] as const)(
    "%s does not import forbidden domain runtimes",
    (module, forbidden) => {
      for (const file of sourceFiles(path.join(modules, module))) {
        for (const dependency of preProcessFile(readFileSync(file, "utf8"))
          .importedFiles) {
          const target = dependency.fileName.startsWith("@/")
            ? path.resolve(process.cwd(), "src", dependency.fileName.slice(2))
            : path.resolve(path.dirname(file), dependency.fileName);
          for (const domain of forbidden) {
            const relative = path.relative(path.join(modules, domain), target);
            expect(
              relative === "" ||
                (!relative.startsWith("..") && !path.isAbsolute(relative)),
              `${file} must not import ${dependency.fileName}`,
            ).toBe(false);
          }
        }
      }
    },
  );
});
