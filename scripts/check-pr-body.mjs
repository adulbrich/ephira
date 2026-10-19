/**
 * The rules a pull request body answers to, beyond the prose rule.
 *
 * - **Screenshots.** A PR that changes what a screen looks like carries a
 *   screenshot or says why not. Jest renders without drawing and the review
 *   skills read a diff, so a clipped label reaches `main` unless a person
 *   looks. Satisfied by a `## Screenshots` section with an image, or the line
 *   `Screenshots: none, because <reason>`. A PR that touches no UI path is
 *   exempt. Ported from eecs-capstone.
 * - **The review loop.** The body records each review's pass count and the
 *   commit the last passes saw (CONTRIBUTING.md, "The review loop"). This
 *   proves the record exists, not that the reviews ran.
 *
 * HTML comments are stripped first, so the template's placeholders, which sit
 * in comments, satisfy nothing. Copied out of the comment they still fail: an
 * image must point at an http(s) address, and a reason must be words, not
 * `<reason>` or `...`. A section runs from its `##` heading to the next `#`
 * or `##`, so `###` subsections stay inside it.
 *
 * One implementation, two callers. The `pr-text` workflow runs the CLI with
 * the changed paths on stdin and the body in a file, so a body is data and
 * never shell. The Claude Code `guard-gh` hook imports the checks and warns
 * on `gh pr create` and `gh pr edit`.
 *
 * Usage:
 *   node scripts/check-pr-body.mjs --files-stdin --body <file>
 */
import { readFileSync } from "node:fs";

const UI_PATH =
  /^(?:app\/|components\/|assets\/|constants\/(?:Colors\.ts$|themes\/))/;
const NOT_UI = /(?:\/__tests__\/|\.test\.[^/]+$|\.md$)/;
const COMMENT = /<!--[\s\S]*?-->/g;
const NEXT_HEADING = /^#{1,2}\s/m;
// An image hosted somewhere (GitHub's uploads are https), not the template's
// `(link)` placeholder; a reason that is words, not `<reason>` or `...`.
const IMAGE = /!\[[^\]]*\]\(https?:\/\/[^)\s]+\)|<img\b[^>]*\bsrc="https?:\/\//;
const OPT_OUT =
  /^\s*Screenshots:\s*none,\s*because\s+(?![^\n]*[<>])(?!\.{3}\s*$)(.*\w.*)$/m;
const LOOP_FIELDS = [
  "Code review passes",
  "Correctness passes",
  "Security passes",
  "Last pass on commit",
];

/** Whether a changed file is one whose change a reader should look at. */
export function isUiPath(path) {
  return UI_PATH.test(path) && !NOT_UI.test(path);
}

/** The text under `## <title>` with comments removed, or null if absent. */
function section(body, title) {
  const text = body.replace(COMMENT, "");
  const heading = new RegExp(`^##\\s+${title}\\s*$`, "m").exec(text);
  if (!heading) {
    return null;
  }
  const rest = text.slice(heading.index + heading[0].length);
  const next = NEXT_HEADING.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

/**
 * The screenshots problem with `body` for a change to `paths`, or null.
 */
export function checkPrScreenshots(body, paths) {
  if (!paths.some(isUiPath)) {
    return null;
  }
  const found = section(body, "Screenshots");
  if (found === null) {
    return "the diff touches a UI path (app/, components/, assets/ or a theme) but the body has no `## Screenshots` section; add one with an image, or the line `Screenshots: none, because <reason>`";
  }
  if (IMAGE.test(found) || OPT_OUT.test(found)) {
    return null;
  }
  return "the `## Screenshots` section has no image and no `Screenshots: none, because <reason>` line with a real reason";
}

/**
 * The review-loop problem with `body`, or null when it records the loop.
 */
export function checkReviewLoop(body) {
  const found = section(body, "Review loop");
  if (found === null) {
    return "the body has no `## Review loop` section; record each review's pass count and the commit the last passes saw (CONTRIBUTING.md, The review loop)";
  }
  const empty = LOOP_FIELDS.filter(
    (field) => !new RegExp(`^\\s*-\\s*${field}:[ \\t]*\\S`, "m").test(found),
  );
  return empty.length === 0
    ? null
    : `the \`## Review loop\` section leaves ${empty.map((f) => `"${f}"`).join(", ")} empty`;
}

function main(argv) {
  const bodyAt = argv.indexOf("--body");
  if (!argv.includes("--files-stdin") || bodyAt === -1) {
    process.stderr.write(
      "usage: check-pr-body.mjs --files-stdin --body <file>\n",
    );
    process.exit(2);
  }
  const paths = readFileSync(0, "utf8")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
  const body = readFileSync(argv[bodyAt + 1], "utf8");
  const problems = [
    checkPrScreenshots(body, paths),
    checkReviewLoop(body),
  ].filter(Boolean);
  for (const problem of problems) {
    process.stderr.write(`pull request body: ${problem}\n`);
  }
  if (problems.length > 0) {
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split("/").pop())
) {
  main(process.argv.slice(2));
}
