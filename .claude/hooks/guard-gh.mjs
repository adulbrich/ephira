/**
 * PreToolUse on Bash: the text a `gh` command would publish gets the checks a
 * commit message gets, before it reaches the remote.
 *
 * This is the one place the published-text rules (no session link, no emdash,
 * no emoji) can be enforced for PR, issue, review, comment and release text:
 * the repo is public, and lefthook never sees `gh` text. The text checked is
 * the command line plus every body it sends that this hook can read: a body,
 * notes or `--input` file, a `-F body=@file` field, a `--body "$(cat f)"`, and
 * a heredoc. The line is read with `shell-words.mjs`, so a flag inside quoted
 * text is not a flag, and a `gh` command inside `$(...)` is still one. The
 * rules come from `scripts/check-prose.mjs`, loaded from the session's
 * checkout when it is this repository and from the hook's own checkout
 * anywhere else.
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
import { readCommands } from "./shell-words.mjs";

// Branch names here carry a slash (`type/name`).
const RENAMES_BRANCH = /\bgh\s+api\b[\s\S]*\/branches\/\S+\/rename\b/;
const PUBLISHING = {
  pr: new Set(["create", "edit", "comment", "review", "close", "merge"]),
  issue: new Set(["create", "edit", "comment", "close"]),
  release: new Set(["create", "edit"]),
};
// A backstop for lines the reader reports it did not follow (a backtick, a
// quote left open, a gh nested deeper than it reads): when such a line looks
// like a publishing gh command, the whole line is still checked.
const LOOKS_PUBLISHING =
  /\bgh\s+(?:(?:pr|issue)\s+(?:create|edit|comment|review|close|merge)|release\s+(?:create|edit)|api\b[\s\S]*(?:\bbody\b|--input\b))/;
const CAT_HEREDOC =
  /^\$\(\s*cat\s*<<-?\s*["']?(\w+)["']?\n([\s\S]*?)\n\1\s*\)$/;
const CAT_FILE = /^\$\(\s*(?:cat\s+|<\s*)(["']?)([^"'\s)]+)\1\s*\)$/;
const HOOK_CHECKOUT = fileURLToPath(new URL("../..", import.meta.url));
// A copy, so a name read at run time is a plain lookup (the Expo lint rule
// against dynamic env access is about app code, which Expo inlines).
const ENV = { ...process.env };

const input = readInput();
const command = input.tool_input?.command ?? "";
const cwd = input.cwd ?? process.cwd();

if (RENAMES_BRANCH.test(command)) {
  deny(
    "Renaming a branch deletes the old ref, and GitHub closes any PR whose head it was (CONTRIBUTING.md, Create a Branch). Open a new PR from a new branch instead, or ask the user.",
  );
}

/**
 * What one `gh` command publishes, or null if it publishes nothing: the
 * files and inline texts it sends, its heredoc bodies when it reads stdin,
 * and its `--base` and `--head`.
 */
function publication({ words, heredocs }) {
  const at = words.findIndex((w) => w === "gh" || w.endsWith("/gh"));
  if (at === -1) {
    return null;
  }
  const [group, action] = words.slice(at + 1);
  const sent = { files: [], inline: [], base: null, head: null, pr: false };
  for (let k = at + 1; k < words.length; k++) {
    // `--flag=value`, and a short flag with its value attached (`-Ffile`).
    const short = /^(-[FfbnBH])=?(.+)$/s.exec(words[k]);
    const [name, attached] = words[k].startsWith("--")
      ? words[k].split(/=(.*)/s)
      : short
        ? [short[1], short[2]]
        : [words[k]];
    const value = () => attached ?? words[++k] ?? "";
    if (name === "-F" || name === "--field") {
      const field = value();
      if (field.startsWith("body=@")) {
        sent.files.push(field.slice("body=@".length));
      } else if (field.startsWith("body=")) {
        sent.inline.push(field.slice("body=".length));
      } else if (!/^[\w.[\]]+=/.test(field)) {
        sent.files.push(field);
      }
    } else if (name === "-f" || name === "--raw-field") {
      const field = value();
      if (field.startsWith("body=")) {
        sent.inline.push(field.slice("body=".length));
      }
    } else if (["--body-file", "--notes-file", "--input"].includes(name)) {
      sent.files.push(value());
    } else if (["-b", "--body", "-n", "--notes"].includes(name)) {
      sent.inline.push(value());
    } else if (name === "-B" || name === "--base") {
      sent.base = value();
    } else if (name === "-H" || name === "--head") {
      sent.head = value();
    }
  }
  if (sent.files.includes("-")) {
    sent.inline.push(...heredocs);
    sent.files = sent.files.filter((file) => file !== "-");
  }
  const publishes =
    PUBLISHING[group]?.has(action) ||
    (group === "api" && (sent.files.length > 0 || sent.inline.length > 0));
  sent.pr = group === "pr" && (action === "create" || action === "edit");
  return publishes ? sent : null;
}

/** Every publishing `gh` command in `text`, inside substitutions too. */
function publications(text, depth = 0) {
  const { commands, inner, uncertain } = readCommands(text);
  const found = commands.map(publication).filter(Boolean);
  let unsure = uncertain || (depth >= 3 && inner.length > 0);
  if (depth < 3) {
    for (const body of inner) {
      const nested = publications(body, depth + 1);
      found.push(...nested.found);
      unsure ||= nested.unsure;
    }
  }
  return { found, unsure };
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

function readFile(given, unreadable) {
  const path = resolvePath(given);
  try {
    if (path !== null && existsSync(path) && statSync(path).isFile()) {
      return readFileSync(path, "utf8");
    }
  } catch {
    // Unreadable for any reason; reported below.
  }
  unreadable.push(given);
  return null;
}

/**
 * The texts the publications send, in order, and the files they name that
 * this hook cannot read. An inline `$(cat <<EOF ...)` is its heredoc, and an
 * inline `$(cat file)` or `$(< file)` is that file.
 */
function bodiesOf(found) {
  const unreadable = [];
  const textsOf = (sent) => [
    ...sent.files.map((file) => readFile(file, unreadable)),
    ...sent.inline.map((value) => {
      const heredoc = CAT_HEREDOC.exec(value);
      if (heredoc) {
        return heredoc[2];
      }
      const file = CAT_FILE.exec(value);
      return file ? readFile(file[2], unreadable) : value;
    }),
  ];
  const texts = found.map((sent) => ({
    sent,
    text: textsOf(sent)
      .filter((t) => t !== null)
      .join("\n"),
  }));
  return { texts, unreadable };
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

let found = [];
let unsure = false;
try {
  ({ found, unsure } = publications(command));
} catch (error) {
  deny(
    `guard-gh could not read this command line (${error.message}); refusing to publish it unchecked.`,
  );
}
if (found.length === 0 && !(unsure && LOOKS_PUBLISHING.test(command))) {
  process.exit(0);
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

let bodies;
let problems = [];
try {
  bodies = bodiesOf(found);
  problems = prose
    .findPublishedViolations(
      [command, ...bodies.texts.map(({ text }) => text)].join("\n"),
    )
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
if (bodies.unreadable.length > 0) {
  warnings.push(
    `guard-gh could not read ${bodies.unreadable.join(", ")} to check it (it may not exist yet, or name a shell variable the hook does not share). pr-text checks a PR's title and body in CI; nothing checks issue or comment text there, so check it yourself with \`node scripts/check-prose.mjs --stdin --published < <file>\`.`,
  );
}

const prBody = await loadScript(root, "check-pr-body.mjs");
for (const { sent, text } of bodies.texts) {
  if (!(prBody && sent.pr && text)) {
    continue;
  }
  const changed = git(root, [
    "diff",
    "--name-only",
    `origin/${sent.base ?? "main"}...${sent.head ?? "HEAD"}`,
  ])
    .split("\n")
    .filter(Boolean);
  const problem = [
    prBody.checkPrScreenshots(text, changed),
    prBody.checkReviewLoop(text),
  ].filter(Boolean);
  if (problem.length > 0) {
    warnings.push(
      `pr-text will fail this pull request: ${problem.join("; ")} (CONTRIBUTING.md, "The gates").`,
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
