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
const API_WITH_BODY = /\bgh\s+api\b[\s\S]*(?:\bbody\b|--input\b)/;
const PR_BODY = /\bgh\s+pr\s+(?:create|edit)\b/;
// `gh api -F body=@file` is a field read from a file; `-F` with a name
// before `=` is any other field, and is skipped.
const API_BODY_FILE = /\bbody=@(?:"([^"]+)"|'([^']+)'|(\S+))/g;
const FILE_FLAG =
  /(?:^|\s)(?:-F|--body-file|--notes-file|--input)(?:=|\s+)(?!\w+=)(?:"([^"]+)"|'([^']+)'|(\S+))/g;
// Branch names here carry a slash (`type/name`).
const RENAMES_BRANCH = /\bgh\s+api\b[\s\S]*\/branches\/\S+\/rename\b/;
const INLINE_FLAG =
  /(?:^|\s)(?:-b|--body|-n|--notes)(?:=|\s+)(?:"((?:[^"\\]|\\.)*)"|'([^']*)')/;
const HOOK_CHECKOUT = fileURLToPath(new URL("../..", import.meta.url));

const input = readInput();
const command = input.tool_input?.command ?? "";
const cwd = input.cwd ?? process.cwd();

if (RENAMES_BRANCH.test(command)) {
  deny(
    "Renaming a branch deletes the old ref, and GitHub closes any PR whose head it was (CONTRIBUTING.md, Create a Branch). Open a new PR from a new branch instead, or ask the user.",
  );
}

if (!(PUBLISHES.test(command) || API_WITH_BODY.test(command))) {
  process.exit(0);
}

/**
 * A file name as the shell would expand it: `~`, `$VAR` and `${VAR}` from
 * this process's environment, which the session shares. Null when it holds a
 * substitution this cannot evaluate.
 */
function expandPath(given) {
  if (/\$\(|`/.test(given)) {
    return null;
  }
  const expanded = given
    .replace(/^~(?=\/|$)/, process.env.HOME ?? "~")
    .replace(
      /\$\{(\w+)\}|\$(\w+)/g,
      (_, braced, bare) => process.env[braced ?? bare] ?? "",
    );
  return isAbsolute(expanded) ? expanded : join(cwd, expanded);
}

/**
 * The texts the command sends from files or inline, and the files it names
 * that cannot be read. A file of `-` is stdin, whose heredoc is already part
 * of the command line.
 */
function bodiesOf(text) {
  const bodies = [];
  const unreadable = [];
  for (const match of [
    ...text.matchAll(API_BODY_FILE),
    ...text.matchAll(FILE_FLAG),
  ]) {
    const given = match.slice(1).find((part) => part !== undefined);
    if (given === "-") {
      continue;
    }
    const path = expandPath(given);
    if (path && existsSync(path)) {
      bodies.push(readFileSync(path, "utf8"));
    } else {
      unreadable.push(given);
    }
  }
  const inline = INLINE_FLAG.exec(text);
  if (inline) {
    bodies.push(inline[1] ?? inline[2]);
  }
  return { bodies, unreadable };
}

/**
 * The published-text rules, from the session's checkout when it has them and
 * from the hook's own checkout otherwise (a session elsewhere, or a worktree
 * on a branch older than the rules). Null only if neither loads.
 */
async function publishedRules(root) {
  for (const base of [root, HOOK_CHECKOUT]) {
    try {
      const script = await loadScript(base, "check-prose.mjs");
      if (typeof script?.findPublishedViolations === "function") {
        return script;
      }
    } catch {
      // A broken script in one checkout; try the next.
    }
  }
  return null;
}

// Fails closed: text this hook cannot check is not published.
const root = trustedRoot(cwd);
const prose = await publishedRules(root);
if (!prose) {
  deny(
    "guard-gh could not load scripts/check-prose.mjs, so it cannot check this text; refusing to publish it unchecked.",
  );
}
const { bodies, unreadable } = bodiesOf(command);
if (unreadable.length > 0) {
  deny(
    `guard-gh cannot read ${unreadable.join(", ")} to check it; refusing to publish it unchecked. Pass a path it can resolve (absolute, or with $VAR, ~ or relative to the session's directory).`,
  );
}
const body = bodies.length > 0 ? bodies.join("\n") : null;
const published = [command, ...bodies].join("\n");
let problems = [];
try {
  problems = prose
    .findPublishedViolations(published)
    .map(prose.describeViolation);
} catch (error) {
  deny(
    `guard-gh failed while checking this text (${error.message}); refusing to publish it unchecked.`,
  );
}

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
