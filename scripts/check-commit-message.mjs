/**
 * The commit-message rule in AGENTS.md, as a check: a Conventional Commits
 * subject with a lowercase imperative, the prose rule over the whole message,
 * and never a `claude.ai/code/session` link.
 *
 * One implementation, three callers. lefthook runs it at `commit-msg`, CI runs
 * it over every commit a pull request adds (`--range`), and the Claude Code
 * `guard-git` hook runs it on the text of a `git commit` before the commit
 * exists, so `--no-verify` does not get a bad message past an agent.
 *
 * The session link is checked first: the repo is public, and a link that
 * reaches a merged commit on `main` stays in its history for good.
 *
 * Usage:
 *   node scripts/check-commit-message.mjs <file>          the COMMIT_EDITMSG path
 *   node scripts/check-commit-message.mjs --stdin         a message on stdin
 *   node scripts/check-commit-message.mjs --range <a..b>  every commit in a range
 *
 * Only the file form strips git's `#` comment lines and the scissors block,
 * because only COMMIT_EDITMSG carries them.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { findProseViolations, gitLines } from "./check-prose.mjs";

const TYPES = [
  "feat",
  "fix",
  "docs",
  "test",
  "refactor",
  "style",
  "perf",
  "build",
  "ci",
  "chore",
];

/**
 * `type(scope)!: subject`, scope optional. "Lowercase imperative" is checked
 * as "does not start with a capital letter", so a subject may lead with a
 * digit, a quote or an identifier in backticks.
 */
const SUBJECT = new RegExp(
  `^(?:${TYPES.join("|")})(?:\\([a-z0-9-]+\\))?!?: (?!\\p{Lu})\\S`,
  "u",
);

/**
 * Subjects written by git, GitHub and Dependabot, which the rule does not
 * reach: a merge commit's subject, a revert, an autosquash marker, and
 * Dependabot's capitalized "Bump".
 */
const EXEMPT_SUBJECT =
  /^(?:Merge |Revert |fixup! |squash! |(?:chore|build)\(deps(?:-dev)?\): Bump )/;

const SESSION_LINK = "claude.ai/code/session";
const SCISSORS = /^# -{8,} >8 -{8,}$/m;

function stripCommentary(message) {
  const scissors = SCISSORS.exec(message);
  const body = scissors ? message.slice(0, scissors.index) : message;
  return body
    .split("\n")
    .filter((line) => !line.startsWith("#"))
    .join("\n");
}

/**
 * Every problem with `message`, as strings a committer can act on. Empty
 * means the message passes.
 */
export function checkCommitMessage(message) {
  const problems = [];

  if (message.includes(SESSION_LINK)) {
    problems.push(
      `contains a ${SESSION_LINK} link; drop it, keep the Co-Authored-By trailer`,
    );
  }

  const subject =
    message.split("\n").find((line) => line.trim().length > 0) ?? "";
  if (subject.length === 0) {
    problems.push("the message is empty");
  } else if (!(EXEMPT_SUBJECT.test(subject) || SUBJECT.test(subject))) {
    problems.push(
      `subject "${subject}" is not "type(scope): lowercase imperative" with type one of ${TYPES.join(", ")}`,
    );
  }

  for (const { line, kind, snippet } of findProseViolations(message)) {
    problems.push(`line ${line} has an ${kind}: ${snippet}`);
  }

  return problems;
}

const RULE =
  "Commit rule: type(scope): lowercase imperative subject, no emdash, no emoji, no session link. See AGENTS.md.\n";

function report(label, problems) {
  for (const problem of problems) {
    process.stderr.write(`${label}: ${problem}\n`);
  }
}

function main(argv) {
  const [mode, range] = argv;
  let failed = false;

  if (mode === "--range") {
    // Merge commits are walked too: their subject is exempt, but their body
    // carries the PR title, which the prose rule and the session link reach.
    for (const sha of gitLines(["log", "--format=%H", range])) {
      const message = execFileSync("git", ["log", "-1", "--format=%B", sha], {
        encoding: "utf8",
      });
      const problems = checkCommitMessage(message);
      if (problems.length > 0) {
        failed = true;
        report(sha.slice(0, 7), problems);
      }
    }
  } else {
    const message =
      mode === "--stdin"
        ? readFileSync(0, "utf8")
        : stripCommentary(readFileSync(mode, "utf8"));
    const problems = checkCommitMessage(message);
    failed = problems.length > 0;
    report("commit message", problems);
  }

  if (failed) {
    process.stderr.write(RULE);
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split("/").pop())
) {
  main(process.argv.slice(2));
}
