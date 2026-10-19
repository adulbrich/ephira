/**
 * PreToolUse on Bash: the git rules from AGENTS.md, enforced before the
 * command runs rather than remembered.
 *
 * - Stage by name: no `git add -A`, `git add .`, `git commit -a`.
 * - Never commit on main.
 * - No force push at main, no `reset --hard`, `clean -f`, `branch -D`, or a
 *   working-tree wipe through `checkout .` and `restore .`.
 * - A commit message that would fail `commit-msg` fails here first, for the
 *   forms this can read (`-m`, `--message`, a `cat` heredoc, `-F -`), so a
 *   `--no-verify` does not get one of those past lefthook.
 *
 * Everything else, including a plain push, a rebase and a stash, goes through.
 *
 * The command line is tokenized rather than matched as text: git's global
 * options (`git -C dir add`, `git -c k=v commit`) sit between `git` and the
 * subcommand, flags come in short, long and clustered forms (`-f`, `--force`,
 * `-fd`), and a refspec can carry the force as a `+`. Quoted strings and
 * heredoc bodies are blanked before parsing, so a commit message that
 * mentions `git add -A` is not a `git add -A`. Ported from eecs-capstone.
 *
 * This catches honest mistakes, not a determined bypass: `eval`, `sh -c` or an
 * abbreviated long option gets past a parser that is not the shell. The hard
 * boundary is server-side, where the ruleset refuses pushes to main.
 */
import {
  currentBranch,
  deny,
  loadScript,
  readInput,
  trustedRoot,
} from "./lib.mjs";

const HEREDOC = /<<-?\s*(["']?)([A-Za-z_][A-Za-z0-9_]*)\1\n([\s\S]*?)\n\2\b/;
const CAT_HEREDOC =
  /(?:-m|--message)(?:=|\s+)"?\$\(\s*cat\s*<<-?\s*["']?[A-Za-z_]/;
const STDIN_HEREDOC = /(?:-F|--file)(?:=|\s+)-\s/;
const QUOTED = /"(?:[^"\\]|\\.)*"|'[^']*'/g;
const MESSAGE_FLAG =
  /(?:^|\s)(?:-[A-Za-z]*m|--message)(?:=|\s*)(?:"((?:[^"\\]|\\.)*)"|'([^']*)')/g;
const SEGMENT = /\s*(?:&&|\|\||;|\||&)\s*|\n/;
const SHORT_CLUSTER = /^-[A-Za-z]+$/;
const WHITESPACE = /\s+/;
const MAIN_REF = /(?:^|[:+])(?:refs\/heads\/)?main$/;
/** Global options that take a separate argument. */
const GLOBAL_WITH_ARG = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--exec-path",
  "--namespace",
]);

const input = readInput();
// A backslash-newline continues the line, so the shell reads one command.
const command = (input.tool_input?.command ?? "").replaceAll("\\\n", " ");
const cwd = input.cwd ?? process.cwd();

if (!/\bgit\b/.test(command)) {
  process.exit(0);
}

/**
 * `{ sub, args }` for the git invocation in one shell segment, or null.
 */
function parseGit(segment) {
  // A subshell's parentheses cling to the first and last words.
  const tokens = segment
    .trim()
    .split(WHITESPACE)
    .map((t) => t.replace(/^\(+/, "").replace(/\)+$/, ""));
  const at = tokens.findIndex((t) => t === "git" || t.endsWith("/git"));
  if (at === -1) {
    return null;
  }
  let i = at + 1;
  while (i < tokens.length && tokens[i].startsWith("-")) {
    i += GLOBAL_WITH_ARG.has(tokens[i]) ? 2 : 1;
  }
  return { sub: tokens[i] ?? "", args: tokens.slice(i + 1) };
}

const isDot = (t) => t === "." || t === "./";
/** A short flag cluster carrying `letter`, as `-f` or `-fd` carry `f`. */
const shortFlag = (t, letter) =>
  SHORT_CLUSTER.test(t) && t.slice(1).includes(letter);
/** `--long` or the short `letter` in any cluster, as `--force` or `-fd`. */
const hasFlag = (args, long, letter) =>
  args.some((t) => t === long || shortFlag(t, letter));

function stagingRule(sub, args) {
  if (
    sub === "add" &&
    args.some((t) => t === "-A" || t === "--all" || isDot(t))
  ) {
    return "Stage files by name (AGENTS.md): `git add -A` and `git add .` sweep up unrelated work in progress. Name the paths.";
  }
  if (sub === "commit" && hasFlag(args, "--all", "a")) {
    return "Stage files by name (AGENTS.md): `git commit -a` commits every modified file. Stage the paths, then commit.";
  }
  return null;
}

function pushRule(args) {
  const forced =
    hasFlag(args, "--force", "f") ||
    args.some(
      (t) =>
        t.startsWith("--force-with-lease") ||
        t === "--force-if-includes" ||
        t.startsWith("+"),
    );
  if (!forced) {
    return null;
  }
  const atMain =
    args.some((t) => MAIN_REF.test(t)) || currentBranch(cwd) === "main";
  return atMain
    ? "No force push at main. The ruleset would reject it anyway."
    : null;
}

function destructiveRule(sub, args) {
  switch (sub) {
    case "reset":
      return args.includes("--hard")
        ? "No `git reset --hard` from an agent: it discards uncommitted work the user may want. Ask them to run it."
        : null;
    case "clean":
      return hasFlag(args, "--force", "f")
        ? "No `git clean -f` from an agent. Ask the user to run it."
        : null;
    case "branch": {
      const forceDelete =
        args.some((t) => shortFlag(t, "D")) ||
        (hasFlag(args, "--delete", "d") && hasFlag(args, "--force", "f"));
      return forceDelete
        ? "No `git branch -D` from an agent. Use `-d`, or ask the user to force-delete."
        : null;
    }
    case "checkout":
      return args.some(isDot)
        ? "No working-tree wipe (`git checkout .`) from an agent. Name the paths to restore."
        : null;
    case "restore": {
      const indexOnly =
        hasFlag(args, "--staged", "S") && !hasFlag(args, "--worktree", "W");
      return args.some(isDot) && !indexOnly
        ? "No working-tree wipe (`git restore .`) from an agent. Name the paths to restore."
        : null;
    }
    default:
      return null;
  }
}

function ruleBroken(sub, args, alreadyBranched) {
  const onMain =
    sub === "commit" && !alreadyBranched && currentBranch(cwd) === "main"
      ? "Never commit on main (AGENTS.md). Fetch, branch from origin/main as `type/name`, then commit."
      : null;
  return (
    stagingRule(sub, args) ??
    onMain ??
    (sub === "push" ? pushRule(args) : destructiveRule(sub, args))
  );
}

function createsBranch(sub, args) {
  return (
    (sub === "checkout" && args.some((t) => t === "-b" || t === "-B")) ||
    (sub === "switch" && args.some((t) => t === "-c" || t === "-C"))
  );
}

/**
 * The message a `git commit` would record, or null when it cannot be read
 * here (a file, an editor, a substitution). Two heredoc shapes are read:
 * `-m "$(cat <<'EOF' ... EOF)"` and `-F - <<'EOF' ... EOF`.
 */
function extractCommitMessage(text) {
  const shape = CAT_HEREDOC.exec(text) ?? STDIN_HEREDOC.exec(text);
  if (shape) {
    return HEREDOC.exec(text.slice(shape.index))?.[3] ?? null;
  }
  const parts = [];
  for (const match of text.matchAll(MESSAGE_FLAG)) {
    parts.push(match[1] ?? match[2]);
  }
  if (parts.length === 0 || parts.some((p) => p.includes("$("))) {
    return null;
  }
  return parts.join("\n\n").replaceAll("\\n", "\n");
}

const detectable = command.replace(HEREDOC, "<<HEREDOC").replace(QUOTED, '""');
let branched = false;
let commits = false;

for (const segment of detectable.split(SEGMENT)) {
  const call = parseGit(segment);
  if (!call) {
    continue;
  }
  const reason = ruleBroken(call.sub, call.args, branched);
  if (reason) {
    deny(reason);
  }
  if (createsBranch(call.sub, call.args)) {
    branched = true;
  }
  if (call.sub === "commit") {
    commits = true;
  }
}

if (commits) {
  const message = extractCommitMessage(command);
  const script = await loadScript(trustedRoot(cwd), "check-commit-message.mjs");
  if (message !== null && script) {
    const problems = script.checkCommitMessage(message);
    if (problems.length > 0) {
      deny(
        `Commit message fails the rule (AGENTS.md):\n${problems.map((p) => `- ${p}`).join("\n")}`,
      );
    }
  }
}
