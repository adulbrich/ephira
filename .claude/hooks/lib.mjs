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
import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";

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
 * One of the repo's own check scripts, loaded from the session's checkout so a
 * worktree checks against the rules it carries. Null when the checkout has no
 * such script (a session outside this repo, or a branch older than the
 * script), and the caller skips only the rule that script implements.
 */
export async function loadScript(root, name) {
  const path = `${root}/scripts/${name}`;
  return existsSync(path) ? await import(path) : null;
}
