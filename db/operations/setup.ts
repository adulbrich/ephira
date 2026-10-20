/**
 * The real files, key store and SQL behind db/databaseFile.ts.
 *
 * This is the only file that imports expo-sqlite
 * (db/__tests__/expoSqliteImport.test.ts holds it to that), and tests
 * substitute it wholesale through __tests__/helpers/testDatabase.ts, so
 * nothing here runs under Jest. ADR 0005's Consequences say how it is
 * checked on a device instead.
 */
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "@/drizzle/migrations";
import * as schema from "@/db/schema";
import {
  type DatabaseFiles,
  type DatabaseStatus,
  type OpenedDatabase,
  WrongKeyError,
  deleteDatabase,
  discardUnreadableDatabase as discardFrom,
  isDatabaseKey,
  openDatabaseFile,
} from "@/db/databaseFile";

const KEY_NAME = "ephira.databaseKey";
const KEY_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

/** Files SQLite keeps beside a database, deleted before the database itself. */
const SIBLING_SUFFIXES = ["-journal", "-wal", "-shm"];

const directoryUri = `file://${encodeURI(SQLite.defaultDatabaseDirectory)}`;
const fileNamed = (name: string) => new File(directoryUri, name);

const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;

/** A raw key, so SQLCipher uses the bytes as given instead of deriving a key. */
function rawKey(key: string): string {
  if (!isDatabaseKey(key)) {
    throw new Error("Refusing to issue a malformed database key");
  }
  return quote(`x'${key}'`);
}

const files: DatabaseFiles<SQLite.SQLiteDatabase> = {
  exists: (name) => fileNamed(name).exists,
  remove: (name) => {
    for (const suffix of [...SIBLING_SUFFIXES, ""]) {
      const file = fileNamed(name + suffix);
      if (file.exists) file.delete();
    }
  },
  rename: (from, to) => fileNamed(from).rename(to),
  readKey: () => SecureStore.getItem(KEY_NAME, KEY_OPTIONS),
  writeKey: (key) => SecureStore.setItem(KEY_NAME, key, KEY_OPTIONS),
  randomBytes: (count) => Crypto.getRandomBytes(count),
  open: (name, key) => {
    const connection = SQLite.openDatabaseSync(name, {
      enableChangeListener: true,
    });
    if (key !== undefined) connection.execSync(`PRAGMA key = ${rawKey(key)}`);
    return connection;
  },
  countSchemaObjects: (connection) => {
    try {
      return (
        connection.getFirstSync<{ count: number }>(
          "SELECT count(*) AS count FROM sqlite_master",
        )?.count ?? 0
      );
    } catch (error) {
      // SQLCipher reports a key that does not open the file as SQLITE_NOTADB.
      if (String(error).includes("file is not a database")) {
        throw new WrongKeyError();
      }
      throw error;
    }
  },
  exportEncrypted: (plaintext, name, key) => {
    const path = `${SQLite.defaultDatabaseDirectory}/${name}`;
    plaintext.execSync(
      `ATTACH DATABASE ${quote(path)} AS pending KEY ${rawKey(key)}`,
    );
    try {
      plaintext.execSync("SELECT sqlcipher_export('pending')");
    } finally {
      plaintext.execSync("DETACH DATABASE pending");
    }
  },
  close: (connection) => connection.closeSync(),
};

let opened: OpenedDatabase<SQLite.SQLiteDatabase> | undefined;

const openOnce = () => {
  opened ??= openDatabaseFile(files);
  return opened;
};

/**
 * What every module holds instead of the connection itself. Each one under
 * db/operations captured its handle at import, and replaceDatabase swaps the
 * connection underneath them.
 */
const database = new Proxy({} as SQLite.SQLiteDatabase, {
  get: (_target, property) => {
    const { connection } = openOnce();
    const value = Reflect.get(connection, property);
    return typeof value === "function" ? value.bind(connection) : value;
  },
});

export const getDatabase = () => database;

/**
 * Whether the database opened. Anything but "ready" means getDatabase() is an
 * empty in-memory stand-in, and nothing may query it.
 */
export const getDatabaseStatus = (): DatabaseStatus => openOnce().status;

/** Deletes an encrypted database that cannot be opened. Takes effect on restart. */
export const discardUnreadableDatabase = () => discardFrom(files);

const db = drizzle(getDatabase(), { schema });

/**
 * Delete Data's database step: a new empty file under a new key. Rejects,
 * with the old database open again, when a file could not be deleted.
 */
export async function replaceDatabase() {
  const current = openOnce();
  opened = undefined;
  try {
    deleteDatabase(files, current);
  } finally {
    openOnce();
  }
}

/**
 * Creates the tables in the file replaceDatabase left, as a launch does; the
 * shell's useMigrations ran at launch and does not run again. Its own step,
 * because a failure here comes after the data has gone.
 */
export const migrateDatabase = () => migrate(db, migrations);

export const getDrizzleDatabase = () => {
  return db;
};
