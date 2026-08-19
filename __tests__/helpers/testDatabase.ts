/**
 * The test seam.
 *
 * Every `db/operations/*.ts` file reaches the database handle through the one
 * specifier `@/db/operations/setup`, and that module is the only place in the
 * repo that imports `expo-sqlite`. A test substitutes this module for it:
 *
 *     jest.mock("@/db/operations/setup", () =>
 *       require("@/__tests__/helpers/testDatabase"),
 *     );
 *
 * Babel hoists `jest.mock` above every import in the file, wherever it is
 * written, so the substitution is in place before the module-level
 * `const db = getDrizzleDatabase()` in each operations file evaluates. No production code has to become injectable, and with this
 * mock installed `expo-sqlite` is never loaded at all.
 *
 * The handle is per test file, because those module-level captures happen once
 * per module registry and cannot be swapped afterwards. Isolation between
 * tests comes from `resetTestDatabase`, not from a fresh connection.
 */
import fs from "fs";
import path from "path";
import BetterSqlite3 from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../drizzle");

type Journal = { entries: { idx: number; tag: string }[] };

/**
 * Applies the checked-in migrations in journal order.
 *
 * Deliberately not `drizzle/migrations.js`: that file pulls the `.sql` files
 * through `babel-plugin-inline-import`, which is a Metro arrangement and does
 * not exist under jest. Reading the same files from disk keeps the tests on
 * exactly the DDL the device runs.
 */
function runMigrationFile(connection: BetterSqlite3.Database, tag: string) {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, `${tag}.sql`), "utf8");

  for (const statement of sql.split("--> statement-breakpoint")) {
    const trimmed = statement.trim();
    if (trimmed.length > 0) connection.exec(trimmed);
  }
}

function applyMigrations(connection: BetterSqlite3.Database) {
  const journal: Journal = JSON.parse(
    fs.readFileSync(path.join(MIGRATIONS_DIR, "meta", "_journal.json"), "utf8"),
  );

  for (const entry of [...journal.entries].sort((a, b) => a.idx - b.idx)) {
    runMigrationFile(connection, entry.tag);
  }
}

let connection: BetterSqlite3.Database | undefined;
let database: BetterSQLite3Database<typeof schema> | undefined;

function open() {
  if (!connection || !database) {
    connection = new BetterSqlite3(":memory:");
    // Deliberately stricter than the device, which has no PRAGMA anywhere and
    // therefore runs with foreign keys off. Constraint violations that the
    // device swallows into orphaned rows fail loudly here.
    connection.pragma("foreign_keys = ON");
    applyMigrations(connection);
    database = drizzle(connection, { schema });
  }
  return { connection, database };
}

/** The drizzle handle the operations modules will use. */
export const getDrizzleDatabase = () => open().database;

/** Stands in for the raw Expo handle. Nothing under test calls it today. */
export const getDatabase = () => open().connection;

/** The same handle, for tests that want to assert against it directly. */
export const getTestDatabase = () => open().database;

/**
 * Empties every table, leaving the schema in place. Foreign keys go off for
 * the duration so the order of the deletes cannot matter; they are back on
 * before the next test writes anything.
 */
export function resetTestDatabase() {
  const { connection: db } = open();
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
    .all() as { name: string }[];

  db.pragma("foreign_keys = OFF");
  for (const { name } of tables) db.exec(`DELETE FROM "${name}"`);
  const hasSequence = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sqlite_sequence'",
    )
    .get();
  if (hasSequence) db.exec("DELETE FROM sqlite_sequence");
  db.pragma("foreign_keys = ON");
}

/**
 * Runs one migration again, by tag, against the open database. Data migrations
 * are only observable if something is in the tables when they run, and the
 * schema is already at head here, so a test seeds the state the migration is
 * meant to repair and then replays just that file.
 */
export function applyMigration(tag: string) {
  runMigrationFile(open().connection, tag);
}

/**
 * Runs `write` with foreign keys off, then turns them back on.
 *
 * Only for setting up the state a device gets into: the app ships no PRAGMA,
 * so on device foreign keys are off and rows that violate them can and do
 * exist. Do not reach for this to make an assertion pass.
 */
export function withForeignKeysOff(write: () => void) {
  const { connection: db } = open();
  db.pragma("foreign_keys = OFF");
  try {
    write();
  } finally {
    db.pragma("foreign_keys = ON");
  }
}
