import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Which pushes make Vercel build the website.
 *
 * `docs/ignored-build-step.sh` cancels a deployment when a push changed
 * nothing the site is built from. Both ways of getting that wrong are silent:
 * too eager and every app push pays for a build again; too lax and production
 * keeps serving an old privacy policy while every deployment reads
 * "Canceled". These run the real script against throwaway repositories whose
 * `origin` is the repository itself, so fetching `main` works offline.
 */
const SCRIPT = path.resolve(__dirname, "../docs/ignored-build-step.sh");
const ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "test",
  GIT_COMMITTER_EMAIL: "test@example.com",
};

const WEBSITE = [
  "docs/src/pages/privacy.astro",
  "docs/src/content/post.md",
  "docs/public/robots.txt",
  "docs/astro.config.mjs",
  "docs/package.json",
  "docs/vercel.json",
  "docs/ignored-build-step.sh",
  "docs/PRIVACY.md",
];
const NOT_WEBSITE = [
  "docs/adr/0099-decision.md",
  "docs/agents/notes.md",
  "docs/plans/plan.md",
  "docs/README.md",
  "docs/CYCLE_PREDICTION_TEST_PLAN.md",
  "docs/.vscode/settings.json",
  "docs/.gitignore",
  "app/index.tsx",
  "README.md",
];

const made: string[] = [];

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, env: ENV, encoding: "utf8" }).trim();
}

function change(repo: string, file: string): string {
  const full = path.join(repo, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.appendFileSync(full, "change\n");
  git(repo, "add", file);
  git(repo, "commit", "-q", "-m", file);
  return git(repo, "rev-parse", "HEAD");
}

/** A repository on `main` with a website and docs/, its own `origin`. */
function repository(): string {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "ignored-build-step-"));
  made.push(repo);
  git(repo, "init", "-q", "-b", "main");
  change(repo, "docs/src/pages/index.astro");
  git(repo, "remote", "add", "origin", `file://${repo}`);
  return repo;
}

/** Whether the script builds, given the last successful deployment's SHA. */
function builds(repo: string, previous: string): boolean {
  const run = spawnSync("sh", [SCRIPT], {
    cwd: path.join(repo, "docs"),
    env: { ...ENV, VERCEL_GIT_PREVIOUS_SHA: previous },
    encoding: "utf8",
  });
  return run.status !== 0;
}

afterAll(() => {
  for (const repo of made) fs.rmSync(repo, { recursive: true, force: true });
});

test("after a deployment, only a change to the website builds", () => {
  const repo = repository();
  const wrong = [
    ...WEBSITE.map((file) => [file, true] as const),
    ...NOT_WEBSITE.map((file) => [file, false] as const),
  ].flatMap(([file, expected]) => {
    const previous = git(repo, "rev-parse", "HEAD");
    change(repo, file);
    return builds(repo, previous) === expected
      ? []
      : [`${file} ${expected ? "skipped" : "built"}`];
  });
  expect(wrong).toEqual([]);
});

test("a change anywhere since the last deployment builds, not only in the newest commit", () => {
  const repo = repository();
  const previous = change(repo, "docs/README.md");
  change(repo, "docs/src/pages/privacy.astro");
  change(repo, "app/index.tsx");
  expect(builds(repo, previous)).toBe(true);
});

test("a branch's first deployment compares its website with main's", () => {
  const repo = repository();
  git(repo, "switch", "-q", "-c", "website");
  change(repo, "docs/src/pages/privacy.astro");
  change(repo, "app/index.tsx");
  expect(builds(repo, "")).toBe(true);

  git(repo, "switch", "-q", "-c", "app", "main");
  change(repo, "docs/agents/notes.md");
  change(repo, "app/index.tsx");
  expect(builds(repo, "")).toBe(false);
});

test("main with no deployment to compare with builds", () => {
  const repo = repository();
  change(repo, "app/index.tsx");
  expect(builds(repo, "")).toBe(true);
});

test("a previous deployment it cannot find builds", () => {
  const repo = repository();
  change(repo, "app/index.tsx");
  expect(builds(repo, "0123456789abcdef0123456789abcdef01234567")).toBe(true);
});
