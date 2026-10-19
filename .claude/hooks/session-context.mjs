/**
 * SessionStart: the facts every session used to have to discover, printed
 * into context. Branch and whether it is main, uncommitted changes, the Node
 * in use against `.nvmrc`, whether installed Expo matches the lockfile, and
 * whether another Metro already holds the default port. No network.
 *
 * Every probe is capped short and fails quiet: an answer that takes long is a
 * convenience not worth delaying a session for.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { cleanEnv, currentBranch, git, readInput, repoRoot } from "./lib.mjs";

const METRO_PORT = 8081;

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Who listens on the Metro port, as "pid (cwd)", or "" for nobody or no
 * answer. The cwd says which checkout that Metro serves: the Debug app loads
 * its bundle from this port, so another session's Metro here serves that
 * session's code.
 */
function metroListener() {
  try {
    const pid = execFileSync(
      "lsof",
      ["-nP", `-iTCP:${METRO_PORT}`, "-sTCP:LISTEN", "-t"],
      {
        encoding: "utf8",
        env: cleanEnv,
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 1500,
      },
    )
      .trim()
      .split("\n")[0];
    if (!pid) {
      return "";
    }
    const cwd = execFileSync("lsof", ["-a", "-p", pid, "-d", "cwd", "-Fn"], {
      encoding: "utf8",
      env: cleanEnv,
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 1500,
    })
      .split("\n")
      .find((line) => line.startsWith("n"))
      ?.slice(1);
    return cwd ? `${pid} (${cwd})` : pid;
  } catch {
    return "";
  }
}

const input = readInput();
const cwd = input.cwd ?? process.cwd();
const root = repoRoot(cwd);
const lines = [];

const branch = currentBranch(cwd) || "(detached)";
lines.push(
  branch === "main"
    ? "Branch: main. Do not commit here: fetch, then branch from origin/main as `type/name` (AGENTS.md)."
    : `Branch: ${branch}.`,
);

const dirty = git(cwd, ["status", "--porcelain"])
  .split("\n")
  .filter(Boolean).length;
lines.push(
  dirty === 0
    ? "Working tree: clean."
    : `Working tree: ${dirty} uncommitted path(s). Stage by name; they may be someone else's work in progress.`,
);

let wanted = "";
try {
  wanted = readFileSync(`${root}/.nvmrc`, "utf8").trim().replace(/^v/, "");
} catch {
  // No .nvmrc in this checkout.
}
const node = process.version.replace(/^v/, "");
lines.push(
  wanted && !node.startsWith(wanted)
    ? `Node: ${node} on PATH, .nvmrc wants ${wanted}.`
    : `Node: ${node}.`,
);

const installed = readJson(`${root}/node_modules/expo/package.json`)?.version;
const locked = readJson(`${root}/package-lock.json`)?.packages?.[
  "node_modules/expo"
]?.version;
if (!installed) {
  lines.push("Dependencies: not installed. Run `npm ci`.");
} else if (locked && installed !== locked) {
  lines.push(
    `Dependencies: expo ${installed} installed, ${locked} locked. Run \`npm ci\` before trusting a test or a build.`,
  );
}

const metro = metroListener();
if (metro) {
  lines.push(
    `Metro: port ${METRO_PORT} is held by ${metro}. A Debug build loads whatever that Metro serves; start yours on another port or confirm it is this checkout.`,
  );
}

lines.push(
  "Gates: lefthook.yml at commit and push, the hooks under .claude/hooks in this session. CONTRIBUTING.md has the table.",
);

process.stdout.write(`${lines.join("\n")}\n`);
