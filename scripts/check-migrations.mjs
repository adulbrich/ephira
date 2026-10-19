/**
 * The bookkeeping docs/adr/0002 asks of a hand-written migration, as a check.
 * drizzle-kit keeps four things in step when it generates a migration; a
 * hand-written data migration has to do it by hand, and a miss fails only on
 * a device:
 *
 * - every journal entry has its `.sql` file, and every `.sql` file its entry;
 * - the journal's `idx` runs 0, 1, 2 with no gap, each tag starts with its
 *   four-digit index, and each `when` is later than the one before, since a
 *   device skips a migration that is not newer than the last it ran;
 * - `drizzle/migrations.js` exports `m0000`, `m0001` and so on, each the
 *   import of that entry's file, which is what `useMigrations` looks up;
 * - the snapshots form one chain with fresh ids: each `prevId` is the
 *   previous snapshot's `id`, and no snapshot outlives its journal entry, so
 *   the next `drizzle-kit generate` diffs against the right base.
 *
 * lefthook runs it on the working tree, not the index, so a staged `.sql`
 * whose journal entry is not staged passes there; CI checks the commit.
 *
 * It does not check that a shipped migration is unchanged; the Claude Code
 * `guard-edits` hook refuses that edit, and review catches the rest.
 *
 * Usage:
 *   node scripts/check-migrations.mjs [drizzle-dir]
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Every problem with the migrations in `dir`, as strings. Empty means the
 * bookkeeping agrees.
 */
export function checkMigrations(dir) {
  const problems = [];
  const journal = readJson(join(dir, "meta/_journal.json"), problems);
  if (!Array.isArray(journal?.entries)) {
    return [...problems, "meta/_journal.json has no entries list"];
  }
  const tags = journal.entries.map((entry) => entry.tag);
  const pad = (n) => String(n).padStart(4, "0");

  journal.entries.forEach((entry, position) => {
    if (entry.idx !== position) {
      problems.push(`journal entry ${position} has idx ${entry.idx}`);
    }
    if (!String(entry.tag).startsWith(pad(position))) {
      problems.push(`journal entry ${position} has tag ${entry.tag}`);
    }
    if (!existsSync(join(dir, `${entry.tag}.sql`))) {
      problems.push(
        `journal names ${entry.tag} but ${entry.tag}.sql is missing`,
      );
    }
    // drizzle applies a migration only when its `when` is newer than the
    // last one a device recorded, so an equal or older one is skipped.
    const before = journal.entries[position - 1];
    if (before && !(entry.when > before.when)) {
      problems.push(
        `${entry.tag} has when ${entry.when}, not after ${before.tag}'s ${before.when}; devices past ${before.tag} would skip it`,
      );
    }
  });

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql"))) {
    if (!tags.includes(file.replace(/\.sql$/, ""))) {
      problems.push(`${file} has no journal entry, so no device runs it`);
    }
  }

  // useMigrations runs `migrations["m" + idx]` from the export, so check that
  // key, through its import, names the journal's file.
  const source = readFileSync(join(dir, "migrations.js"), "utf8");
  const fileOf = Object.fromEntries(
    [
      ...source.matchAll(
        /^import\s+(\w+)\s+from\s+["']\.\/([^"']+)\.sql["']/gm,
      ),
    ].map((m) => [m[1], m[2]]),
  );
  const exported = /migrations\s*:\s*\{([^}]*)\}/.exec(source)?.[1] ?? "";
  const keyed = Object.fromEntries(
    exported
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, value] = part.split(":").map((s) => s.trim());
        return [key, value ?? key];
      }),
  );
  journal.entries.forEach((entry, position) => {
    const key = `m${pad(position)}`;
    const file = fileOf[keyed[key]];
    if (file !== entry.tag) {
      problems.push(
        `migrations.js exports ${key} as ${file ?? "nothing"}, but the journal's entry ${position} is ${entry.tag}`,
      );
    }
  });

  let previous = "00000000-0000-0000-0000-000000000000";
  const ids = new Set();
  tags.forEach((tag, position) => {
    const name = `${pad(position)}_snapshot.json`;
    const path = join(dir, "meta", name);
    if (!existsSync(path)) {
      problems.push(`${name} is missing for ${tag}`);
      return;
    }
    const snapshot = readJson(path, problems) ?? {};
    if (snapshot.prevId !== previous) {
      problems.push(
        `${name} has prevId ${snapshot.prevId}, expected the previous id ${previous}`,
      );
    }
    if (ids.has(snapshot.id)) {
      problems.push(`${name} reuses id ${snapshot.id}; give it a fresh one`);
    }
    ids.add(snapshot.id);
    previous = snapshot.id;
  });

  for (const file of readdirSync(join(dir, "meta"))) {
    const at = /^(\d{4})_snapshot\.json$/.exec(file);
    if (at && Number(at[1]) >= tags.length) {
      problems.push(`${file} has no journal entry`);
    }
  }

  return problems;
}

function readJson(path, problems) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    problems.push(`${path} is not valid JSON: ${error.message}`);
    return null;
  }
}

function main(argv) {
  const problems = checkMigrations(argv[0] ?? "drizzle");
  if (problems.length > 0) {
    for (const problem of problems) {
      process.stderr.write(`drizzle: ${problem}\n`);
    }
    process.stderr.write(
      "Migration bookkeeping disagrees; docs/adr/0002 lists the four files a migration touches.\n",
    );
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split("/").pop())
) {
  main(process.argv.slice(2));
}
