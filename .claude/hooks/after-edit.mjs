/**
 * PostToolUse on Edit and Write: the prose rule and Biome on the one file just
 * written, reported on the edit that caused the problem rather than at commit
 * time.
 *
 * PostToolUse cannot block, but stderr on exit 2 is shown to the model, which
 * is the point: the finding lefthook would make at pre-commit, a few minutes
 * earlier and one file at a time. Biome decides which files it covers
 * (`files.includes` in biome.jsonc); `--no-errors-on-unmatched` keeps an
 * excluded path from reading as a failure. Each rule runs only if its tool
 * exists in this checkout, so a missing script skips that rule, not both.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { loadScript, readInput, repoRelative, repoRoot } from "./lib.mjs";

const BIOME_EXTENSIONS = /\.(?:[cm]?jsx?|tsx?|jsonc?|css)$/;

const input = readInput();
const root = repoRoot(input.cwd ?? process.cwd());
const path = repoRelative(root, input.tool_input?.file_path ?? "");

if (!path || path.startsWith("../") || !existsSync(`${root}/${path}`)) {
  process.exit(0);
}

let failed = false;

const prose = await loadScript(root, "check-prose.mjs");
if (prose?.isCheckedPath(path)) {
  const result = spawnSync(
    process.execPath,
    ["scripts/check-prose.mjs", path],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== 0) {
    failed = true;
    process.stderr.write(result.stderr);
  }
}

const biome = `${root}/node_modules/.bin/biome`;
if (BIOME_EXTENSIONS.test(path) && existsSync(biome)) {
  const result = spawnSync(biome, ["check", "--no-errors-on-unmatched", path], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    failed = true;
    process.stderr.write(
      `Biome reports on ${path} (\`npm run format\` applies the safe fixes):\n${result.stdout}${result.stderr}`,
    );
  }
}

process.exit(failed ? 2 : 0);
