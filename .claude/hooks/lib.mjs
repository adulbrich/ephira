/**
 * Shared plumbing for the Claude Code hooks in this directory.
 *
 * A hook is a process that reads one JSON object on stdin and answers with an
 * exit code: 0 lets the tool call through, 2 blocks it and hands stderr to the
 * model as the reason. The `cwd` field, not `CLAUDE_PROJECT_DIR`, is where the
 * session is: inside a worktree the project dir still points at the main
 * checkout, so the repository root is resolved from `cwd`.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

/**
 * `process.env` without the `GIT_*` keys a git hook exports. Running git on
 * the session's `cwd` with `GIT_DIR` still set answers about the wrong
 * repository.
 */
export const cleanEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
);

export function readInput() {
  return JSON.parse(readFileSync(0, "utf8"));
}

/**
 * Block the tool call with a reason the model will read.
 */
export function deny(reason) {
  process.stderr.write(`${reason}\n`);
  process.exit(2);
}

export function git(cwd, args) {
  try {
    return execFileSync("git", ["-C", cwd, ...args], {
      encoding: "utf8",
      env: cleanEnv,
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).trim();
  } catch {
    return "";
  }
}

export function currentBranch(cwd) {
  return git(cwd, ["branch", "--show-current"]);
}

/**
 * The checkout that contains `cwd`, or `cwd` itself outside a repository.
 */
export function repoRoot(cwd) {
  return git(cwd, ["rev-parse", "--show-toplevel"]) || cwd;
}

/**
 * A path as the repo scripts expect it: relative to the checkout root.
 */
export function repoRelative(root, path) {
  return relative(root, path).replaceAll("\\", "/");
}

/**
 * The trusted checkout an edited file belongs to and its path inside it, or
 * null. Resolved from the file itself, not the session's cwd, so an edit in a
 * worktree is judged by that worktree, and through symlinks (`/tmp` is
 * `/private/tmp` on macOS) so the spelling of the path does not matter. The
 * file may not exist yet, so its nearest existing directory is resolved.
 */
export function locate(filePath) {
  if (!filePath) {
    return null;
  }
  const absolute = resolve(filePath);
  let dir = dirname(absolute);
  while (!existsSync(dir) && dirname(dir) !== dir) {
    dir = dirname(dir);
  }
  const root = trustedRoot(dir);
  if (!root) {
    return null;
  }
  const real = join(realpathOr(dir), relative(dir, absolute));
  const path = repoRelative(realpathOr(root), real);
  return path && !path.startsWith("../") ? { root, path } : null;
}

function realpathOr(path) {
  try {
    return realpathSync(path);
  } catch {
    return "";
  }
}

/**
 * The checkout root for `cwd` when it is this project's repository (the main
 * checkout or one of its worktrees), or null anywhere else.
 *
 * The hooks import scripts and run binaries from the root they resolve. A
 * session can `cd` into any clone, so resolving the root from `cwd` alone
 * would run whatever code that clone ships. Two checks, because each alone
 * has a gap: the root must share this repository's git directory, and it
 * must be a live checkout the repository lists (a stale, prunable entry does
 * not count, since another directory could since have taken its path).
 *
 * Trust is per checkout, not per commit: a checkout of someone else's branch
 * runs that branch's scripts, as lefthook and npm scripts already do. Read a
 * branch's `.claude/` and `scripts/` before checking it out.
 */
export function trustedRoot(cwd) {
  const project = process.env.CLAUDE_PROJECT_DIR;
  const root = project ? git(cwd, ["rev-parse", "--show-toplevel"]) : "";
  if (!(root && commonDir(cwd) && commonDir(cwd) === commonDir(project))) {
    return null;
  }
  const live = git(project, ["worktree", "list", "--porcelain"])
    .split("\n\n")
    .filter((entry) => !/^prunable\b/m.test(entry))
    .map((entry) => /^worktree (.+)$/m.exec(entry)?.[1])
    .filter(Boolean)
    .map(realpathOr);
  return live.includes(realpathOr(root)) ? root : null;
}

function commonDir(dir) {
  return realpathOr(
    git(dir, ["rev-parse", "--path-format=absolute", "--git-common-dir"]),
  );
}

/**
 * One of the repo's own check scripts, loaded from the session's checkout so a
 * worktree checks against the rules it carries. Null when `root` is not
 * trusted or has no such script (a branch older than the script), and the
 * caller skips only the rule that script implements.
 */
export async function loadScript(root, name) {
  const path = root ? `${root}/scripts/${name}` : "";
  return path && existsSync(path) ? await import(path) : null;
}
