/**
 * PreToolUse on Bash: the text a `gh` command would publish gets the checks a
 * commit message gets, before it reaches the remote.
 *
 * This is the one place the published-text rules (no session link, no emdash,
 * no emoji) can be enforced for PR, issue, review, comment and release text:
 * the repo is public, and lefthook never sees `gh` text. The text checked is
 * the command line plus every body, notes or `--input` file it names that
 * this hook can read. The rules come from `scripts/check-prose.mjs`, loaded
 * from the session's checkout when it is this repository and from the hook's
 * own checkout anywhere else, so a session elsewhere is still guarded.
 *
 * A named file the hook cannot read gets a warning, not a refusal: it may be
 * written earlier in the same command, or named through a shell variable the
 * hook does not share (the sandboxed shell's `$TMPDIR` is not the hook's).
 * The PR-body rules (a screenshot for a UI change, the review-loop record)
 * also only warn: the `pr-text` workflow refuses a PR's title and body.
 * Ported from eecs-capstone.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deny, git, loadScript, readInput, trustedRoot } from "./lib.mjs";

const PUBLISHES =
  /\bgh\s+(?:(?:pr|issue)\s+(?:create|edit|comment|review|close|merge)|release\s+(?:create|edit))\b/;
const API_WITH_BODY = /\bgh\s+api\b[\s\S]*(?:\bbody\b|--input\b)/;
const PR_BODY = /\bgh\s+pr\s+(?:create|edit)\b/;
// Branch names here carry a slash (`type/name`).
const RENAMES_BRANCH = /\bgh\s+api\b[\s\S]*\/branches\/\S+\/rename\b/;
const HEREDOC = /<<-?\s*(["']?)(\w+)\1\n[\s\S]*?\n\2\b/g;
const QUOTED = /"((?:[^"\\]|\\.)*)"|'([^']*)'/g;
const TOKEN = /\0(\d+)\0/g;
// Looked for in the masked line, so a flag written inside quoted text is not
// read as one. `-F` and `--field` take `name=value`, read from a file only
// as `body=@path`; `gh pr` and `gh issue` take `-F path`.
const FILE_FLAG =
  /(?:^|\s)(-F|--field|--body-file|--notes-file|--input)(?:=|\s+)(\S+)/g;
// Read on the unmasked line, so a `--body "$(cat <<EOF ...)"` keeps its text.
const INLINE_FLAG =
  /(?:^|\s)(?:-b|--body|-n|--notes)(?:=|\s+)(?:"((?:[^"\\]|\\.)*)"|'([^']*)')/g;
const CAT_HEREDOC =
  /^\$\(\s*cat\s*<<-?\s*["']?(\w+)["']?\n([\s\S]*?)\n\1\s*\)$/;
const HOOK_CHECKOUT = fileURLToPath(new URL("../..", import.meta.url));
// A copy, so a name read at run time is a plain lookup (the Expo lint rule
// against dynamic env access is about app code, which Expo inlines).
const ENV = { ...process.env };

const input = readInput();
// A backslash-newline continues the line, so the shell reads one command.
const command = (input.tool_input?.command ?? "").replaceAll("\\\n", " ");
const cwd = input.cwd ?? process.cwd();

if (RENAMES_BRANCH.test(command)) {
  deny(
    "Renaming a branch deletes the old ref, and GitHub closes any PR whose head it was (CONTRIBUTING.md, Create a Branch). Open a new PR from a new branch instead, or ask the user.",
  );
}

/**
 * The command line with heredoc bodies removed and each quoted string
 * replaced by a token, plus the way back from a token to its text.
 */
function mask(text) {
  const strings = [];
  const masked = text
    .replace(HEREDOC, "")
    .replace(QUOTED, (_, double, single) => {
      strings.push(double ?? single);
      return `\0${strings.length - 1}\0`;
    });
  const unmask = (value) =>
    value.replace(TOKEN, (_, at) => strings[Number(at)]);
  return { masked, unmask };
}

const SEGMENT = /\s*(?:&&|\|\||;|\||&)\s*|\n/;
// `gh` as a word: after whitespace, or opening a `(...)` or `$(...)`.
const GH_TOKEN = /(?:^|[\s(])(?:\S*\/)?gh\s/;

/**
 * The `gh` commands on the line, as masked segments: a `gh` token outside
 * quotes, so `grep -F 'gh pr create'` is not one. Each keeps whether it
 * publishes, judged on its unmasked text so a quoted `body=@file` counts.
 */
function ghCommands(text) {
  const { masked, unmask } = mask(text);
  const commands = masked
    .split(SEGMENT)
    .filter((segment) => GH_TOKEN.test(segment))
    .map((segment) => ({ segment, plain: unmask(segment) }))
    .filter(({ plain }) => PUBLISHES.test(plain) || API_WITH_BODY.test(plain));
  return { commands, unmask };
}

/**
 * The file a name refers to, expanding `~` and the variables this hook shares
 * with the session, or null when it holds a substitution or a variable the
 * hook cannot see.
 */
function resolvePath(given) {
  if (/\$\(|`/.test(given)) {
    return null;
  }
  let unresolved = false;
  const expanded = given
    .replace(/^~(?=\/|$)/, ENV.HOME ?? "~")
    .replace(/\$\{(\w+)\}|\$(\w+)/g, (_, braced, bare) => {
      const value = ENV[braced ?? bare];
      unresolved ||= value === undefined;
      return value ?? "";
    });
  if (unresolved) {
    return null;
  }
  return isAbsolute(expanded) ? expanded : join(cwd, expanded);
}

function readable(path) {
  try {
    return path !== null && existsSync(path) && statSync(path).isFile();
  } catch {
    return false;
  }
}

/**
 * The texts the command sends from files and inline, and the files it names
 * that this hook cannot read. A file of `-` is stdin, whose heredoc is
 * already part of the command line.
 */
function bodiesOf(commands, unmask) {
  const masked = commands.map(({ segment }) => segment).join("\n");
  const files = [];
  for (const [, flag, value] of masked.matchAll(FILE_FLAG)) {
    const given = unmask(value);
    if (flag === "-F" || flag === "--field") {
      if (given.startsWith("body=@")) {
        files.push(given.slice("body=@".length));
      } else if (!/^[\w.[\]]+=/.test(given)) {
        files.push(given);
      }
    } else {
      files.push(given);
    }
  }
  const bodies = [];
  const unreadable = [];
  for (const given of files.filter((file) => file !== "-")) {
    // The last word inside `$(...)` carries its closing parenthesis.
    const path = [given, given.replace(/\)+$/, "")]
      .map(resolvePath)
      .find(readable);
    if (path) {
      bodies.push(readFileSync(path, "utf8"));
    } else {
      unreadable.push(given);
    }
  }
  const inline = [...command.matchAll(INLINE_FLAG)].map(
    ([, double, single]) => {
      const value = double ?? single;
      return CAT_HEREDOC.exec(value)?.[2] ?? value;
    },
  );
  return { bodies, inline, unreadable, flagOf: flagReader(masked, unmask) };
}

/** The value of the first of `names` in the masked line, or null. */
function flagReader(masked, unmask) {
  return (...names) => {
    for (const name of names) {
      const found = new RegExp(`(?:^|\\s)${name}(?:=|\\s+)(\\S+)`).exec(masked);
      if (found) {
        return unmask(found[1]);
      }
    }
    return null;
  };
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

// Fails closed: text this hook cannot check against its rules is not
// published.
const root = trustedRoot(cwd);
const prose = await publishedRules(root);
if (!prose) {
  deny(
    "guard-gh could not load scripts/check-prose.mjs, so it cannot check this text; refusing to publish it unchecked.",
  );
}

const { commands, unmask } = ghCommands(command);
if (commands.length === 0) {
  process.exit(0);
}

let parsed;
let problems = [];
try {
  parsed = bodiesOf(commands, unmask);
  problems = prose
    .findPublishedViolations([command, ...parsed.bodies].join("\n"))
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

const warnings = [];
if (parsed.unreadable.length > 0) {
  warnings.push(
    `guard-gh could not read ${parsed.unreadable.join(", ")} to check it (it may not exist yet, or name a shell variable the hook does not share). pr-text checks a PR's title and body in CI; nothing checks issue or comment text there, so check it yourself with \`node scripts/check-prose.mjs --stdin --published < <file>\`.`,
  );
}

const prBody = await loadScript(root, "check-pr-body.mjs");
const body = [...parsed.bodies, ...parsed.inline].join("\n");
const createsPr = commands.some(({ plain }) => PR_BODY.test(plain));
if (prBody && body && createsPr) {
  const base = parsed.flagOf("--base", "-B") ?? "main";
  const head = parsed.flagOf("--head", "-H") ?? "HEAD";
  const changed = git(root, ["diff", "--name-only", `origin/${base}...${head}`])
    .split("\n")
    .filter(Boolean);
  const found = [
    prBody.checkPrScreenshots(body, changed),
    prBody.checkReviewLoop(body),
  ].filter(Boolean);
  if (found.length > 0) {
    warnings.push(
      `pr-text will fail this pull request: ${found.join("; ")} (CONTRIBUTING.md, "The gates").`,
    );
  }
}

if (warnings.length > 0) {
  const warning = warnings.join("\n");
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
