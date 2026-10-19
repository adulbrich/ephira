/**
 * PreToolUse on Bash: the text a `gh` command would publish gets the checks a
 * commit message gets, before it reaches the remote.
 *
 * This is the one place the published-text rules (no session link, no emdash,
 * no emoji) can be enforced for PR, issue, review, comment and release text:
 * the repo is public, and lefthook never sees `gh` text. The text checked is
 * the command line plus any body or notes file it names. The rules come from
 * `scripts/check-prose.mjs`, loaded from the session's checkout when it is
 * this repository and from the hook's own checkout anywhere else, so a
 * session elsewhere is still guarded.
 *
 * The PR-body rules (a screenshot for a UI change, the review-loop record)
 * only warn: the `pr-text` workflow is the gate that refuses. Ported from
 * eecs-capstone.
 */
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deny, git, loadScript, readInput, trustedRoot } from "./lib.mjs";

const PUBLISHES =
  /\bgh\s+(?:(?:pr|issue)\s+(?:create|edit|comment|review|close|merge)|release\s+(?:create|edit))\b/;
const API_WITH_BODY = /\bgh\s+api\b[\s\S]*\bbody\b/;
const PR_BODY = /\bgh\s+pr\s+(?:create|edit)\b/;
const FILE_FLAG =
  /(?:^|\s)(?:-F|--body-file|--notes-file)(?:=|\s+)(?:"([^"]+)"|'([^']+)'|(\S+))/;
const INLINE_FLAG =
  /(?:^|\s)(?:-b|--body|-n|--notes)(?:=|\s+)(?:"((?:[^"\\]|\\.)*)"|'([^']*)')/;
const HOOK_CHECKOUT = fileURLToPath(new URL("../..", import.meta.url));

const input = readInput();
const command = input.tool_input?.command ?? "";
const cwd = input.cwd ?? process.cwd();

if (!(PUBLISHES.test(command) || API_WITH_BODY.test(command))) {
  process.exit(0);
}

/**
 * The body or notes the command sends from a file, or inline, or null. A
 * file of `-` is stdin, whose heredoc is already part of the command line.
 */
function bodyOf(text) {
  const file = FILE_FLAG.exec(text);
  if (file) {
    const given = file[1] ?? file[2] ?? file[3];
    if (given === "-") {
      return null;
    }
    const path = isAbsolute(given) ? given : join(cwd, given);
    return existsSync(path) ? readFileSync(path, "utf8") : null;
  }
  const inline = INLINE_FLAG.exec(text);
  return inline ? (inline[1] ?? inline[2]) : null;
}

const root = trustedRoot(cwd);
const prose = await loadScript(root ?? HOOK_CHECKOUT, "check-prose.mjs");
const body = bodyOf(command);
const published = body === null ? command : `${command}\n${body}`;
const problems = prose
  ? prose.findPublishedViolations(published).map(prose.describeViolation)
  : [];

if (problems.length > 0) {
  deny(
    `This gh command would publish text that breaks a rule (AGENTS.md):\n${problems.map((p) => `- ${p}`).join("\n")}`,
  );
}

const prBody = await loadScript(root, "check-pr-body.mjs");
if (body !== null && prBody && PR_BODY.test(command)) {
  const changed = git(root, ["diff", "--name-only", "origin/main...HEAD"])
    .split("\n")
    .filter(Boolean);
  const found = [
    prBody.checkPrScreenshots(body, changed),
    prBody.checkReviewLoop(body),
  ].filter(Boolean);
  if (found.length > 0) {
    const warning = `pr-text will fail this pull request: ${found.join("; ")} (CONTRIBUTING.md, "The gates").`;
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          additionalContext: warning,
        },
        systemMessage: warning,
      }),
    );
  }
}
