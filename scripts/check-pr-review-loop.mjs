/**
 * A pull request body records the review loop in CONTRIBUTING.md: a pass
 * count for each of the three reviews and the commit the last pass saw. The
 * check proves the record exists, not that the reviews ran; it turns "every
 * PR goes through the loop" from a sentence into something a merge waits on.
 *
 * Satisfied when the body has a `## Review loop` heading and, under it, each
 * of the four template lines with something after its colon. "Under it" runs
 * to the next `#` or `##`.
 *
 * One implementation, two callers. The `pr-text` workflow runs the CLI with
 * the body in a file, so a body is data and never shell. The Claude Code
 * `guard-gh` hook imports `checkReviewLoop` and warns on `gh pr create` and
 * `gh pr edit`.
 *
 * Usage:
 *   node scripts/check-pr-review-loop.mjs --body <file>
 */
import { readFileSync } from "node:fs";

const HEADING = /^##\s+Review loop\s*$/m;
const NEXT_HEADING = /^#{1,2}\s/m;
const FIELDS = [
  "Code review passes",
  "Correctness passes",
  "Security passes",
  "Last pass on commit",
];

/**
 * The problem with `body`, or null when it records the loop.
 */
export function checkReviewLoop(body) {
  const heading = HEADING.exec(body);
  if (!heading) {
    return "the body has no `## Review loop` section; record each review's pass count and the commit the last pass saw (CONTRIBUTING.md, The review loop)";
  }
  const rest = body.slice(heading.index + heading[0].length);
  const next = NEXT_HEADING.exec(rest);
  const section = next ? rest.slice(0, next.index) : rest;
  const missing = FIELDS.filter(
    (field) => !new RegExp(`^\\s*-\\s*${field}:[ \\t]*\\S`, "m").test(section),
  );
  return missing.length === 0
    ? null
    : `the \`## Review loop\` section leaves ${missing.map((f) => `"${f}"`).join(", ")} empty`;
}

function main(argv) {
  const bodyAt = argv.indexOf("--body");
  if (bodyAt === -1) {
    process.stderr.write("usage: check-pr-review-loop.mjs --body <file>\n");
    process.exit(2);
  }
  const problem = checkReviewLoop(readFileSync(argv[bodyAt + 1], "utf8"));
  if (problem) {
    process.stderr.write(`pull request body: ${problem}\n`);
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split("/").pop())
) {
  main(process.argv.slice(2));
}
