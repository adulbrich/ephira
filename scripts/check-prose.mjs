/**
 * The prose rule in AGENTS.md, as a check: no emdash and no emoji in anything
 * tracked, be it docs, comments, string literals or the website's copy.
 *
 * One implementation, four callers. lefthook runs it on staged files at
 * pre-commit, CI runs it over the whole tree (`--all`), the Claude Code
 * `after-edit` hook runs it on each edited file, and the commit-message check
 * and the `gh` hook import `findProseViolations` for the text they guard.
 *
 * "Emoji" means a character that renders as an emoji by default (Unicode's
 * Emoji_Presentation), or any pictograph forced into emoji form by U+FE0F. The
 * typographic symbols the app draws as text are not emoji: the star and heart
 * calendar markers in `components/calendar/CustomDay.tsx` and the check mark
 * in the theme selector. A `--` standing in for a sentence dash breaks the same
 * rule and is not checked, because every command-line flag would trip it.
 *
 * Usage:
 *   node scripts/check-prose.mjs <file>...     check the named files
 *   node scripts/check-prose.mjs --all         check every tracked text file
 *   node scripts/check-prose.mjs --stdin       check stdin as one string
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const EMDASH = "\u2014";
const EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u;

/**
 * Extensions that are prose or source. Anything else `git ls-files` reports
 * (images, fonts, binaries) is skipped rather than misread as UTF-8.
 */
const TEXT_EXTENSIONS = new Set([
  "astro",
  "cjs",
  "css",
  "js",
  "json",
  "jsonc",
  "md",
  "mjs",
  "sh",
  "sql",
  "ts",
  "tsx",
  "txt",
  "yaml",
  "yml",
]);

/**
 * Paths the rule does not reach: generated migrations, the built website, and
 * installed dependencies.
 */
const EXCLUDED_PREFIXES = [
  "drizzle/",
  "docs/dist/",
  "docs/node_modules/",
  "node_modules/",
];
const EXCLUDED_FILES = new Set(["package-lock.json", "docs/package-lock.json"]);

/**
 * The footer the Claude Code harness appends to a PR body, which nothing here
 * can change. Stripped before checking so the footer is not what fails a PR.
 */
const HARNESS_FOOTER = /\u{1F916} Generated with \[Claude Code\]\([^)]*\)/gu;

/**
 * Every hit in `text`, as `{ line, kind, snippet }`, where `kind` is `emdash`
 * or `emoji`.
 */
export function findProseViolations(text) {
  const violations = [];
  const lines = text.replaceAll(HARNESS_FOOTER, "").split("\n");
  for (const [index, line] of lines.entries()) {
    if (line.includes(EMDASH)) {
      violations.push({
        line: index + 1,
        kind: "emdash",
        snippet: line.trim(),
      });
    }
    if (EMOJI.test(line)) {
      violations.push({ line: index + 1, kind: "emoji", snippet: line.trim() });
    }
  }
  return violations;
}

export function isCheckedPath(path) {
  if (EXCLUDED_FILES.has(path)) {
    return false;
  }
  if (EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return false;
  }
  const dot = path.lastIndexOf(".");
  return dot !== -1 && TEXT_EXTENSIONS.has(path.slice(dot + 1));
}

export function gitLines(args) {
  return execFileSync("git", args, { encoding: "utf8" })
    .split("\n")
    .filter((line) => line.length > 0);
}

function report(label, violations) {
  for (const { line, kind, snippet } of violations) {
    const excerpt =
      snippet.length > 100 ? `${snippet.slice(0, 100)}...` : snippet;
    process.stderr.write(`${label}:${line}: ${kind}: ${excerpt}\n`);
  }
}

function checkFiles(paths) {
  let failed = false;
  for (const path of paths) {
    let text;
    try {
      text = readFileSync(path, "utf8");
    } catch {
      // Deleted in the index but still listed. Not a violation.
      continue;
    }
    const violations = findProseViolations(text);
    if (violations.length > 0) {
      failed = true;
      report(path, violations);
    }
  }
  return failed;
}

function main(argv) {
  const [mode] = argv;
  let failed;
  if (mode === "--stdin") {
    const violations = findProseViolations(readFileSync(0, "utf8"));
    report("text", violations);
    failed = violations.length > 0;
  } else if (mode === "--all") {
    failed = checkFiles(gitLines(["ls-files"]).filter(isCheckedPath));
  } else {
    failed = checkFiles(argv.filter(isCheckedPath));
  }
  if (failed) {
    process.stderr.write(
      "Prose rule: no emdash (U+2014) and no emoji. Use a colon, a comma, parentheses or a new sentence; use words for a status mark. See AGENTS.md.\n",
    );
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split("/").pop())
) {
  main(process.argv.slice(2));
}
