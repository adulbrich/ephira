/**
 * PreToolUse on Bash: the text a `gh` command would publish gets the checks a
 * commit message gets, before it reaches the remote.
 *
 * This is the one place the session-link rule can be enforced for PR and
 * issue text: the repo is public, and lefthook never sees `gh` text. The
 * prose rule applies too. The screenshots rule only warns: a `--body-file`
 * may not exist yet in every flow, and the `pr-text` workflow is the gate
 * that refuses. Ported from eecs-capstone.
 */
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { deny, git, loadScript, readInput, trustedRoot } from "./lib.mjs";

const PUBLISHES =
  /\bgh\s+(?:(?:pr|issue)\s+(?:create|edit|comment|review|close|merge)|release\s+(?:create|edit))\b/;
const API_WITH_BODY = /\bgh\s+api\b[\s\S]*\bbody\b/;
const BODIED = /\bgh\s+pr\s+(?:create|edit)\b/;
const BODY_FLAG =
  /(?:^|\s)(?:-b|--body)(?:=|\s+)(?:"((?:[^"\\]|\\.)*)"|'([^']*)')/;
const BODY_FILE_FLAG =
  /(?:^|\s)(?:-F|--body-file)(?:=|\s+)(?:"([^"]+)"|'([^']+)'|(\S+))/;
const SESSION_LINK = "claude.ai/code/session";

const input = readInput();
const command = input.tool_input?.command ?? "";
const cwd = input.cwd ?? process.cwd();

if (!(PUBLISHES.test(command) || API_WITH_BODY.test(command))) {
  process.exit(0);
}

/**
 * The body a `gh pr create` or `gh pr edit` would send, from `--body` or
 * `--body-file`, or null when the command carries neither.
 */
function prBody(text) {
  const file = BODY_FILE_FLAG.exec(text);
  if (file) {
    const given = file[1] ?? file[2] ?? file[3];
    const path = isAbsolute(given) ? given : join(cwd, given);
    return existsSync(path) ? readFileSync(path, "utf8") : null;
  }
  const inline = BODY_FLAG.exec(text);
  return inline ? (inline[1] ?? inline[2]) : null;
}

// Null outside this repository: the session-link rule still applies, the
// rules that need the repo's scripts are skipped.
const root = trustedRoot(cwd);
const body = BODIED.test(command) ? prBody(command) : null;
const published = body === null ? command : `${command}\n${body}`;
const problems = [];

if (published.includes(SESSION_LINK)) {
  problems.push(
    `contains a ${SESSION_LINK} link; never publish one (AGENTS.md)`,
  );
}

const prose = await loadScript(root, "check-prose.mjs");
for (const { line, kind, snippet } of prose?.findProseViolations(published) ??
  []) {
  problems.push(`line ${line} has an ${kind}: ${snippet}`);
}

if (problems.length > 0) {
  deny(
    `This gh command would publish text that breaks a rule (AGENTS.md):\n${problems.map((p) => `- ${p}`).join("\n")}`,
  );
}

const screenshots = await loadScript(root, "check-pr-screenshots.mjs");
if (body !== null && screenshots) {
  const changed = git(root, ["diff", "--name-only", "origin/main...HEAD"])
    .split("\n")
    .filter(Boolean);
  const problem = screenshots.checkPrScreenshots(body, changed);
  if (problem) {
    const warning = `pr-text will fail this pull request: ${problem} (CONTRIBUTING.md, "The gates").`;
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
