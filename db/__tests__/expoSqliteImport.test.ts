/**
 * Only db/operations/setup.ts may import expo-sqlite.
 *
 * Opening a database by name anywhere else is how ADR 0005's upgrade gets
 * undone: <SQLiteProvider databaseName="ephira.db"> recreated an empty
 * plaintext file on every mount. The launch sequence tolerates that file, but
 * a second opener is a second set of rules for which file is the truth.
 * Subpaths count: expo-sqlite/kv-store and expo-sqlite/localStorage open
 * plaintext databases of their own.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const SKIPPED = new Set([
  "node_modules",
  ".git",
  ".expo",
  "android",
  "ios",
  "docs",
  "dist",
]);

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED.has(entry.name)) return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|js)$/.test(entry.name) ? [full] : [];
  });
}

it("only db/operations/setup.ts imports expo-sqlite", () => {
  const importers = sourceFiles(ROOT)
    .filter((file) =>
      /(?:from\s+|import\s+|import\s*\(\s*|require\(\s*)["']expo-sqlite(?:\/[^"']*)?["']/.test(
        fs.readFileSync(file, "utf8"),
      ),
    )
    .map((file) => path.relative(ROOT, file));

  expect(importers).toEqual(["db/operations/setup.ts"]);
});
