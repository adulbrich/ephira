/**
 * The bookkeeping docs/adr/0002 asks of a hand-written migration, as a check.
 * drizzle-kit keeps four things in step when it generates a migration; a
 * hand-written data migration has to do it by hand, and a miss fails only on
 * a device:
 *
 * - every journal entry has its `.sql` file, and every `.sql` file its entry;
 * - `drizzle/migrations.js` imports each one, in journal order, which is what
 *   `useMigrations` actually runs;
 * - the journal's `idx` runs 0, 1, 2 with no gap, and each tag starts with its
 *   four-digit index;
 * - the snapshots form one chain: each `prevId` is the previous snapshot's
 *   `id`, so the next `drizzle-kit generate` diffs against the right base.
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
  const journal = JSON.parse(
    readFileSync(join(dir, "meta/_journal.json"), "utf8"),
  );
  const tags = journal.entries.map((entry) => entry.tag);

  journal.entries.forEach((entry, position) => {
    if (entry.idx !== position) {
      problems.push(`journal entry ${position} has idx ${entry.idx}`);
    }
    if (!entry.tag.startsWith(String(position).padStart(4, "0"))) {
      problems.push(`journal entry ${position} has tag ${entry.tag}`);
    }
    if (!existsSync(join(dir, `${entry.tag}.sql`))) {
      problems.push(
        `journal names ${entry.tag} but ${entry.tag}.sql is missing`,
      );
    }
  });

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql"))) {
    if (!tags.includes(file.replace(/\.sql$/, ""))) {
      problems.push(`${file} has no journal entry, so no device runs it`);
    }
  }

  const imported = [
    ...readFileSync(join(dir, "migrations.js"), "utf8").matchAll(
      /^import\s+\w+\s+from\s+["']\.\/([^"']+)\.sql["']/gm,
    ),
  ].map((match) => match[1]);
  if (imported.join("\n") !== tags.join("\n")) {
    problems.push(
      `migrations.js imports [${imported.join(", ")}] but the journal lists [${tags.join(", ")}]`,
    );
  }

  let previous = "00000000-0000-0000-0000-000000000000";
  tags.forEach((tag, position) => {
    const name = `${String(position).padStart(4, "0")}_snapshot.json`;
    const path = join(dir, "meta", name);
    if (!existsSync(path)) {
      problems.push(`${name} is missing for ${tag}`);
      return;
    }
    const snapshot = JSON.parse(readFileSync(path, "utf8"));
    if (snapshot.prevId !== previous) {
      problems.push(
        `${name} has prevId ${snapshot.prevId}, expected the previous id ${previous}`,
      );
    }
    previous = snapshot.id;
  });

  return problems;
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
