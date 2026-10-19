/**
 * A pull request that changes what a screen looks like carries a screenshot,
 * or says why not. Jest renders components without drawing them and the
 * review skills read a diff, so a clipped label or a modal that covers the
 * tab bar reaches `main` with green checks unless a person looks.
 *
 * Satisfied when the body has a `## Screenshots` heading and, under it,
 * either one image (markdown `![...](...)` or an `<img ...>` tag) or a line
 * `Screenshots: none, because <reason>` with a non-empty reason. "Under it"
 * runs to the next `#` or `##`, so a `###` subsection per screen counts. A
 * pull request that touches no UI path is exempt. The template asks for iOS
 * and Android when the change is platform-specific; the script counts one
 * image, and the second is a code-review item. Ported from eecs-capstone.
 *
 * One implementation, two callers. The `pr-text` workflow runs the CLI with
 * the changed paths on stdin and the body in a file, so a body is data and
 * never shell. The Claude Code `guard-gh` hook imports `checkPrScreenshots`
 * and warns on `gh pr create` and `gh pr edit`.
 *
 * Usage:
 *   node scripts/check-pr-screenshots.mjs --files-stdin --body <file>
 */
import { readFileSync } from "node:fs";

const UI_PATH =
  /^(?:app\/|components\/|assets\/|constants\/(?:Colors\.ts$|themes\/))/;
const EXCLUDED = /(?:\/__tests__\/|\.test\.[^/]+$|\.md$)/;

/** Whether a changed file is one whose change a reader should look at. */
export function isUiPath(path) {
  return UI_PATH.test(path) && !EXCLUDED.test(path);
}

const HEADING = /^##\s+Screenshots\s*$/m;
const NEXT_HEADING = /^#{1,2}\s/m;
const IMAGE = /!\[[^\]]*\]\([^)]+\)|<img\b[^>]*>/;
const OPT_OUT = /^\s*Screenshots:\s*none,\s*because\s+(\S.*)$/m;

/**
 * The problem with `body` for a change to `paths`, or null when it passes.
 */
export function checkPrScreenshots(body, paths) {
  if (!paths.some(isUiPath)) {
    return null;
  }
  const heading = HEADING.exec(body);
  if (!heading) {
    return "the diff touches a UI path (app/, components/, assets/ or a theme) but the body has no `## Screenshots` section; add one with an image, or the line `Screenshots: none, because <reason>`";
  }
  const rest = body.slice(heading.index + heading[0].length);
  const next = NEXT_HEADING.exec(rest);
  const section = next ? rest.slice(0, next.index) : rest;
  if (IMAGE.test(section) || OPT_OUT.exec(section)?.[1]?.trim()) {
    return null;
  }
  if (/^\s*Screenshots:\s*none/m.test(section)) {
    return "the `## Screenshots` section opts out without a reason; write `Screenshots: none, because <reason>`";
  }
  return "the `## Screenshots` section has no image; add one (markdown or <img>), or the line `Screenshots: none, because <reason>`";
}

function main(argv) {
  const bodyAt = argv.indexOf("--body");
  if (!argv.includes("--files-stdin") || bodyAt === -1) {
    process.stderr.write(
      "usage: check-pr-screenshots.mjs --files-stdin --body <file>\n",
    );
    process.exit(2);
  }
  const paths = readFileSync(0, "utf8")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
  const problem = checkPrScreenshots(
    readFileSync(argv[bodyAt + 1], "utf8"),
    paths,
  );
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
