/**
 * PostToolUse on Edit and Write: the prose rule and Biome on the one file just
 * written, reported on the edit that caused the problem rather than at commit
 * time.
 *
 * PostToolUse cannot block, but stderr on exit 2 is shown to the model, which
 * is the point: the finding lefthook would make at pre-commit, a few minutes
 * earlier and one file at a time. `check-prose.mjs` decides which paths the
 * prose rule covers, and Biome decides which files it handles
 * (`files.includes` in biome.jsonc); `--no-errors-on-unmatched` lets it pass
 * over the rest quietly. Each rule runs only if its tool exists in this
 * checkout, so a missing one skips that rule, not both.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { loadScript, locate, readInput } from "./lib.mjs";

const input = readInput();
// Null outside this repository, whose scripts and Biome binary are not ours
// to run.
const found = locate(input.tool_input?.file_path ?? "");
const root = found?.root;
const path = found?.path;

if (!(found && existsSync(`${root}/${path}`))) {
  process.exit(0);
}

const problems = [];

const prose = await loadScript(root, "check-prose.mjs");
if (prose?.isCheckedPath(path)) {
  const text = readFileSync(`${root}/${path}`, "utf8");
  for (const violation of prose.findProseViolations(text)) {
    problems.push(`${path}: ${prose.describeViolation(violation)}`);
  }
  if (problems.length > 0) {
    problems.push(
      "Prose rule: no emdash and no emoji. Use a colon, a comma, parentheses or a new sentence (AGENTS.md).",
    );
  }
}

const biome = `${root}/node_modules/.bin/biome`;
if (existsSync(biome)) {
  const result = spawnSync(biome, ["check", "--no-errors-on-unmatched", path], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    problems.push(
      `Biome reports on ${path} (\`npm run format\` applies the safe fixes):\n${result.stdout}${result.stderr}`,
    );
  }
}

if (problems.length > 0) {
  process.stderr.write(`${problems.join("\n")}\n`);
  process.exit(2);
}
