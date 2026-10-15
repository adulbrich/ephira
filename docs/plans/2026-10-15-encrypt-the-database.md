# Encrypt the Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date**: 2026-10-15 · **Base commit**: 749b54f · **Branch**: `fix/encrypt-database`

**Goal:** Encrypt `ephira.db` with SQLCipher using a random key that never leaves the device, upgrading every existing plaintext database without losing data.

**Architecture:** A module with no Expo imports, `db/databaseFile.ts`, decides at launch which file to open and how a plaintext one becomes encrypted, and takes every effect (files, key store, SQL) as a parameter so Jest can drive every state and failure. `db/operations/setup.ts` supplies the real effects and stays the only importer of `expo-sqlite`. `app/_layout.tsx` splits into a hookless `RootLayout` that branches on the result and the existing body, renamed `AppShell`.

**Tech stack:** Expo SDK 57, expo-sqlite 57 with SQLCipher, expo-secure-store 57, expo-file-system 57 (`File`), expo-crypto, Drizzle, Jest with `better-sqlite3`.

**Spec:** `docs/adr/0005-encrypt-the-database-with-a-device-held-key.md`, as amended on 2026-10-15.

## Global constraints

- File names, exactly: `ephira.db` (legacy plaintext), `ephira.encrypting.db` (export in progress), `ephira.encrypted.db` (encrypted, the source of truth once it exists).
- Key: 32 bytes from `expo-crypto`, lowercase hex (64 characters), stored in `expo-secure-store` under `ephira.databaseKey` with `keychainAccessible: AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, issued as a raw key: `PRAGMA key = 'x''<hex>'''`.
- `db/operations/setup.ts` is the only file that imports `expo-sqlite`.
- `android.allowBackup` is `false`.
- Vocabulary per `CONTEXT.md` and `docs/agents/domain.md`. Never "component", "service", "wrapper", "layer", "boundary" in prose or comments. No em dashes in prose or comments.
- Tests live in `__tests__/` beside the code, named `*.test.ts`.
- `npm run typecheck`, `npm run lint` and `npm test` pass before every commit. `npm run format` fixes formatting.
- Commit messages follow the history: `fix:` / `docs:` plus a sentence saying what changed. End each with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- If `npm` reports a cache permission error, set `npm_config_cache` to a writable directory for that command.

## Decisions taken while planning

These amend the ADR as first approved. The ADR text already reflects them.

| Question | Decision |
| --- | --- |
| What marks an upgrade as finished? | **A rename.** The export goes to `ephira.encrypting.db` and is renamed to `ephira.encrypted.db` only after it opens with the key and matches the original's schema object count. The first version deleted the encrypted file whenever a plaintext one sat beside it, and `<SQLiteProvider databaseName="ephira.db">` recreates exactly that on every mount, so the next launch would have deleted the only copy of the data. |
| An empty encrypted file beside a plaintext one | A stray. Delete it and upgrade from the plaintext file. Nothing an upgrade writes is empty. |
| What does "Start fresh" delete? | The encrypted file only. The key stays; the next launch reuses it for a new file, or replaces it if malformed. |
| The `keyUnavailable` screen | Asks the user to close and reopen the app. An in-app retry cannot work: every module that captured the database handle at import holds the in-memory stand-in. |

## Review Focus

Failure modes the spec implies that no Jest test can reach, most likely first. Each is pinned by a device step in Task 4, in this order, because the first ones fail silently.

1. **A database URI that resolves somewhere else.** If `File` built from `SQLite.defaultDatabaseDirectory` points anywhere but where expo-sqlite opens files, `exists("ephira.db")` is false on a real 1.4.0 install, the app creates a fresh encrypted database, and the user's data disappears from view without being deleted. A fresh install looks perfect in that state. Pinned by Task 4 Step 3 running the upgrade check before anything else.
2. **The key not surviving a round trip through the keychain.** Written with one set of options and read with another, `getItem` returns null and every launch after the upgrade shows the unreadable screen. Pinned by Task 4 Step 5 relaunching twice.
3. **The raw-key quoting.** `PRAGMA key` and `ATTACH ... KEY` both use `'x''<hex>'''`. If SQLCipher misreads it, the data is unreadable, or encrypted under a passphrase-derived key instead. Pinned by Task 4 Step 4: the file header is not plaintext, `sqlite3` refuses it, and the app shows the seeded day.
4. **The splash screen on the unavailable screen.** `SplashScreen.preventAutoHideAsync()` runs at import and only `checkAuthentication` hides it, which never runs there. Pinned by Task 4 Step 6 seeing the screen at all.
5. **A second opener of a database file by name.** Pinned in Jest by the import tripwire in Task 2 Step 1.

---

### Task 1: The launch sequence

**Files:**
- Create: `db/databaseFile.ts`
- Test: `db/__tests__/databaseFile.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export const PLAINTEXT_DATABASE = "ephira.db";
  export const PENDING_DATABASE = "ephira.encrypting.db";
  export const ENCRYPTED_DATABASE = "ephira.encrypted.db";
  export const IN_MEMORY_DATABASE = ":memory:";
  export type DatabaseStatus = "ready" | "unreadable" | "keyUnavailable";
  export type UnavailableStatus = Exclude<DatabaseStatus, "ready">;
  export interface DatabaseFiles<Connection> { /* see Step 3 */ }
  export interface OpenedDatabase<Connection> { status: DatabaseStatus; connection: Connection }
  export function isDatabaseKey(value: string): boolean;
  export function openDatabaseFile<C>(files: DatabaseFiles<C>): OpenedDatabase<C>;
  export function discardUnreadableDatabase<C>(files: DatabaseFiles<C>): void;
  ```

- [ ] **Step 1: Write the failing tests**

Create `db/__tests__/databaseFile.test.ts`:

```ts
/**
 * The launch sequence from ADR 0005, driven through every state a device can
 * be in and every step that can fail. SQLCipher is not available under Jest,
 * so the files, the key store and the SQL are a fake; db/operations/setup.ts
 * supplies the real ones and is checked on a device.
 */
import {
  ENCRYPTED_DATABASE,
  IN_MEMORY_DATABASE,
  PENDING_DATABASE,
  PLAINTEXT_DATABASE,
  type DatabaseFiles,
  type OpenedDatabase,
  discardUnreadableDatabase,
  isDatabaseKey,
  openDatabaseFile,
} from "@/db/databaseFile";

type FakeFile = { key: string | null; schemaObjects: number; days: string[] };
type FakeConnection = { name: string; key: string | null };
type Step = "readKey" | "writeKey" | "export" | "rename" | `remove:${string}`;

/**
 * A phone's database directory and key store, in memory.
 *
 * A file opened with the wrong key, or a plaintext file opened with any key,
 * fails to count its schema objects, which is how SQLCipher reports it too.
 */
class FakeDevice implements DatabaseFiles<FakeConnection> {
  readonly files = new Map<string, FakeFile>();
  readonly connections = new Set<FakeConnection>();
  readonly failing = new Set<Step>();
  storedKey: string | null;
  /** Makes the export drop a table, as an incomplete copy would. */
  shortExport = false;

  constructor(
    files: Record<string, FakeFile>,
    storedKey: string | null = null,
  ) {
    for (const [name, file] of Object.entries(files)) {
      this.files.set(name, file);
    }
    this.storedKey = storedKey;
  }

  /** The process dies and starts again: connections go, files and the key stay. */
  restart() {
    this.connections.clear();
    this.failing.clear();
  }

  names() {
    return [...this.files.keys()].sort();
  }

  file(name: string) {
    const file = this.files.get(name);
    if (!file) throw new Error(`no such file: ${name}`);
    return file;
  }

  exists(name: string) {
    return this.files.has(name);
  }

  remove(name: string) {
    this.fail(`remove:${name}`);
    this.files.delete(name);
  }

  rename(from: string, to: string) {
    this.fail("rename");
    const file = this.file(from);
    this.files.delete(from);
    this.files.set(to, file);
  }

  readKey() {
    this.fail("readKey");
    return this.storedKey;
  }

  writeKey(key: string) {
    this.fail("writeKey");
    this.storedKey = key;
  }

  randomBytes(count: number) {
    return Uint8Array.from({ length: count }, (_, index) => index);
  }

  open(name: string, key?: string) {
    if (name !== IN_MEMORY_DATABASE && !this.files.has(name)) {
      this.files.set(name, { key: key ?? null, schemaObjects: 0, days: [] });
    }
    const connection = { name, key: key ?? null };
    this.connections.add(connection);
    return connection;
  }

  countSchemaObjects(connection: FakeConnection) {
    if (connection.name === IN_MEMORY_DATABASE) return 0;
    const file = this.file(connection.name);
    if (file.key !== connection.key) {
      throw new Error("file is not a database");
    }
    return file.schemaObjects;
  }

  exportEncrypted(plaintext: FakeConnection, name: string, key: string) {
    const source = this.file(plaintext.name);
    if (this.failing.has("export")) {
      // ATTACH has already created the file; the copy stops part-way.
      this.files.set(name, { key, schemaObjects: 3, days: [] });
      throw new Error("export failed");
    }
    this.files.set(name, {
      key,
      schemaObjects: source.schemaObjects - (this.shortExport ? 1 : 0),
      days: [...source.days],
    });
  }

  close(connection: FakeConnection) {
    this.connections.delete(connection);
  }

  private fail(step: Step) {
    if (this.failing.has(step)) throw new Error(`${step} failed`);
  }
}

const KEY = "a".repeat(64);
const OTHER_KEY = "b".repeat(64);
/** What the fake's randomBytes yields, hex-encoded: bytes 0 to 31. */
const GENERATED_KEY = Array.from({ length: 32 }, (_, byte) =>
  byte.toString(16).padStart(2, "0"),
).join("");

const legacyDatabase = (): FakeFile => ({
  key: null,
  schemaObjects: 14,
  days: ["2026-10-01"],
});
const encryptedDatabase = (key = KEY): FakeFile => ({
  key,
  schemaObjects: 14,
  days: ["2026-10-01"],
});
const emptyFile = (key: string | null): FakeFile => ({
  key,
  schemaObjects: 0,
  days: [],
});

/** Every connection the sequence opened is closed, except the one it returned. */
function expectOnlyOpen(
  device: FakeDevice,
  opened: OpenedDatabase<FakeConnection>,
) {
  expect([...device.connections]).toEqual([opened.connection]);
}

beforeEach(() => {
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("isDatabaseKey", () => {
  it.each([
    [GENERATED_KEY, true],
    [KEY, true],
    ["a".repeat(63), false],
    ["A".repeat(64), false],
    ["g".repeat(64), false],
    ["", false],
  ])("%s is a key: %s", (value, expected) => {
    expect(isDatabaseKey(value)).toBe(expected);
  });
});

describe("a fresh install", () => {
  it("creates the encrypted file with a new 32-byte key", () => {
    const device = new FakeDevice({});

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("ready");
    expect(device.storedKey).toBe(GENERATED_KEY);
    expect(device.names()).toEqual([ENCRYPTED_DATABASE]);
    expect(device.file(ENCRYPTED_DATABASE).key).toBe(GENERATED_KEY);
    expect(opened.connection).toEqual({
      name: ENCRYPTED_DATABASE,
      key: GENERATED_KEY,
    });
    expectOnlyOpen(device, opened);
  });

  it("reuses a key the keychain kept across a reinstall", () => {
    const device = new FakeDevice({}, KEY);

    const opened = openDatabaseFile(device);

    expect(device.storedKey).toBe(KEY);
    expect(device.file(ENCRYPTED_DATABASE).key).toBe(KEY);
    expectOnlyOpen(device, opened);
  });

  it("replaces a stored value that is not a key", () => {
    const device = new FakeDevice({}, "not-a-key");

    openDatabaseFile(device);

    expect(device.storedKey).toBe(GENERATED_KEY);
    expect(device.file(ENCRYPTED_DATABASE).key).toBe(GENERATED_KEY);
  });

  it.each(["writeKey", "readKey"] as const)(
    "creates a plaintext file when %s fails",
    (step) => {
      const device = new FakeDevice({});
      device.failing.add(step);

      const opened = openDatabaseFile(device);

      expect(opened.status).toBe("ready");
      expect(device.names()).toEqual([PLAINTEXT_DATABASE]);
      expect(opened.connection).toEqual({
        name: PLAINTEXT_DATABASE,
        key: null,
      });
      expectOnlyOpen(device, opened);
    },
  );
});

describe("upgrading a plaintext database", () => {
  it("moves the data into the encrypted file and deletes the plaintext one", () => {
    const device = new FakeDevice({ [PLAINTEXT_DATABASE]: legacyDatabase() });

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("ready");
    expect(device.names()).toEqual([ENCRYPTED_DATABASE]);
    expect(device.file(ENCRYPTED_DATABASE)).toEqual(
      encryptedDatabase(GENERATED_KEY),
    );
    expect(opened.connection).toEqual({
      name: ENCRYPTED_DATABASE,
      key: GENERATED_KEY,
    });
    expectOnlyOpen(device, opened);
  });

  it("redoes an export that was interrupted", () => {
    const device = new FakeDevice(
      {
        [PLAINTEXT_DATABASE]: legacyDatabase(),
        [PENDING_DATABASE]: { key: KEY, schemaObjects: 3, days: [] },
      },
      KEY,
    );

    const opened = openDatabaseFile(device);

    expect(device.names()).toEqual([ENCRYPTED_DATABASE]);
    expect(device.file(ENCRYPTED_DATABASE)).toEqual(encryptedDatabase(KEY));
    expectOnlyOpen(device, opened);
  });

  it("keeps the plaintext file when the export fails", () => {
    const device = new FakeDevice({ [PLAINTEXT_DATABASE]: legacyDatabase() });
    device.failing.add("export");

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("ready");
    expect(device.names()).toEqual([PLAINTEXT_DATABASE]);
    expect(device.file(PLAINTEXT_DATABASE)).toEqual(legacyDatabase());
    expect(opened.connection).toEqual({ name: PLAINTEXT_DATABASE, key: null });
    expectOnlyOpen(device, opened);
  });

  it("keeps the plaintext file when the copy is incomplete", () => {
    const device = new FakeDevice({ [PLAINTEXT_DATABASE]: legacyDatabase() });
    device.shortExport = true;

    const opened = openDatabaseFile(device);

    expect(device.names()).toEqual([PLAINTEXT_DATABASE]);
    expect(opened.connection).toEqual({ name: PLAINTEXT_DATABASE, key: null });
    expectOnlyOpen(device, opened);
  });

  it("keeps the plaintext file when the rename fails", () => {
    const device = new FakeDevice({ [PLAINTEXT_DATABASE]: legacyDatabase() });
    device.failing.add("rename");

    const opened = openDatabaseFile(device);

    expect(device.names()).toEqual([PLAINTEXT_DATABASE]);
    expect(opened.connection).toEqual({ name: PLAINTEXT_DATABASE, key: null });
    expectOnlyOpen(device, opened);
  });

  it("keeps the plaintext file when a leftover export cannot be deleted", () => {
    const device = new FakeDevice({
      [PLAINTEXT_DATABASE]: legacyDatabase(),
      [PENDING_DATABASE]: emptyFile(KEY),
    });
    device.failing.add(`remove:${PENDING_DATABASE}`);

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("ready");
    expect(device.file(PLAINTEXT_DATABASE)).toEqual(legacyDatabase());
    expect(opened.connection).toEqual({ name: PLAINTEXT_DATABASE, key: null });
    expectOnlyOpen(device, opened);
  });

  it("opens the encrypted file once renamed, even if the plaintext one cannot be deleted", () => {
    const device = new FakeDevice({ [PLAINTEXT_DATABASE]: legacyDatabase() });
    device.failing.add(`remove:${PLAINTEXT_DATABASE}`);

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("ready");
    expect(opened.connection).toEqual({
      name: ENCRYPTED_DATABASE,
      key: GENERATED_KEY,
    });
    expect(device.names()).toEqual([PLAINTEXT_DATABASE, ENCRYPTED_DATABASE]);
    expectOnlyOpen(device, opened);

    device.restart();
    const relaunched = openDatabaseFile(device);

    expect(relaunched.connection.name).toBe(ENCRYPTED_DATABASE);
    expect(device.names()).toEqual([ENCRYPTED_DATABASE]);
    expectOnlyOpen(device, relaunched);
  });
});

describe("an encrypted database", () => {
  it("opens with the stored key", () => {
    const device = new FakeDevice(
      { [ENCRYPTED_DATABASE]: encryptedDatabase() },
      KEY,
    );

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("ready");
    expect(opened.connection).toEqual({ name: ENCRYPTED_DATABASE, key: KEY });
    expectOnlyOpen(device, opened);
  });

  it.each([
    ["the upgrade stopped before deleting it", legacyDatabase()],
    ["something recreated it by name", emptyFile(null)],
  ])(
    "deletes a plaintext file beside it when %s",
    (_, plaintext) => {
      const device = new FakeDevice(
        {
          [PLAINTEXT_DATABASE]: plaintext,
          [ENCRYPTED_DATABASE]: encryptedDatabase(),
        },
        KEY,
      );

      const opened = openDatabaseFile(device);

      expect(device.names()).toEqual([ENCRYPTED_DATABASE]);
      expect(device.file(ENCRYPTED_DATABASE)).toEqual(encryptedDatabase());
      expectOnlyOpen(device, opened);
    },
  );

  it("deletes a leftover export beside it", () => {
    const device = new FakeDevice(
      {
        [ENCRYPTED_DATABASE]: encryptedDatabase(),
        [PENDING_DATABASE]: emptyFile(KEY),
      },
      KEY,
    );

    openDatabaseFile(device);

    expect(device.names()).toEqual([ENCRYPTED_DATABASE]);
  });

  it("treats an empty encrypted file beside a plaintext one as a stray, and upgrades", () => {
    const device = new FakeDevice(
      {
        [PLAINTEXT_DATABASE]: legacyDatabase(),
        [ENCRYPTED_DATABASE]: emptyFile(KEY),
      },
      KEY,
    );

    const opened = openDatabaseFile(device);

    expect(device.names()).toEqual([ENCRYPTED_DATABASE]);
    expect(device.file(ENCRYPTED_DATABASE)).toEqual(encryptedDatabase(KEY));
    expectOnlyOpen(device, opened);
  });

  it.each([
    ["no key is stored", null],
    ["the stored key does not open it", OTHER_KEY],
    ["the stored value is not a key", "not-a-key"],
  ])("is unreadable when %s, and deletes nothing", (_, storedKey) => {
    const device = new FakeDevice(
      { [ENCRYPTED_DATABASE]: encryptedDatabase() },
      storedKey,
    );

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("unreadable");
    expect(opened.connection.name).toBe(IN_MEMORY_DATABASE);
    expect(device.names()).toEqual([ENCRYPTED_DATABASE]);
    expect(device.file(ENCRYPTED_DATABASE)).toEqual(encryptedDatabase());
    expect(device.storedKey).toBe(storedKey);
    expectOnlyOpen(device, opened);
  });

  it("leaves a plaintext file beside it alone while it is unreadable", () => {
    const device = new FakeDevice({
      [PLAINTEXT_DATABASE]: legacyDatabase(),
      [ENCRYPTED_DATABASE]: encryptedDatabase(),
    });

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("unreadable");
    expect(device.names()).toEqual([PLAINTEXT_DATABASE, ENCRYPTED_DATABASE]);
  });

  it("reports the key as unavailable when the key store throws, and deletes nothing", () => {
    const device = new FakeDevice(
      { [ENCRYPTED_DATABASE]: encryptedDatabase() },
      KEY,
    );
    device.failing.add("readKey");

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("keyUnavailable");
    expect(opened.connection.name).toBe(IN_MEMORY_DATABASE);
    expect(device.names()).toEqual([ENCRYPTED_DATABASE]);
    expectOnlyOpen(device, opened);
  });
});

describe("discardUnreadableDatabase", () => {
  it("deletes the encrypted file and keeps the key for the next launch", () => {
    const device = new FakeDevice(
      { [ENCRYPTED_DATABASE]: encryptedDatabase(OTHER_KEY) },
      KEY,
    );
    expect(openDatabaseFile(device).status).toBe("unreadable");

    discardUnreadableDatabase(device);

    expect(device.names()).toEqual([]);
    expect(device.storedKey).toBe(KEY);

    device.restart();
    const relaunched = openDatabaseFile(device);

    expect(relaunched.status).toBe("ready");
    expect(device.file(ENCRYPTED_DATABASE)).toEqual(emptyFile(KEY));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest db/__tests__/databaseFile.test.ts`
Expected: FAIL, `Cannot find module '@/db/databaseFile'`.

- [ ] **Step 3: Write the implementation**

Create `db/databaseFile.ts`:

```ts
/**
 * Which database file to open at launch, and how a plaintext one becomes
 * encrypted. See docs/adr/0005-encrypt-the-database-with-a-device-held-key.md.
 *
 * This module decides; db/operations/setup.ts supplies the files, the key
 * store and the SQL. Keeping every effect a parameter is what lets each state
 * and each failure be tested without SQLCipher, which Jest does not have.
 *
 * The invariant everything here protects: once ENCRYPTED_DATABASE exists it is
 * the source of truth, and PENDING_DATABASE never is. Before the rename that
 * creates it, the plaintext file is the truth and every failure falls back to
 * it. After, nothing falls back.
 */

/** The legacy plaintext database, written by every release up to 1.4.0. */
export const PLAINTEXT_DATABASE = "ephira.db";
/** An export in progress. Always a leftover when this sequence meets one. */
export const PENDING_DATABASE = "ephira.encrypting.db";
/** The encrypted database. */
export const ENCRYPTED_DATABASE = "ephira.encrypted.db";
/** What the app holds when it cannot open its data, so imports still evaluate. */
export const IN_MEMORY_DATABASE = ":memory:";

const KEY_BYTES = 32;

export type DatabaseStatus = "ready" | "unreadable" | "keyUnavailable";

export type UnavailableStatus = Exclude<DatabaseStatus, "ready">;

/** Everything the sequence does to the device, passed in. */
export interface DatabaseFiles<Connection> {
  /** Whether the database file itself exists. Its siblings are not consulted. */
  exists(name: string): boolean;
  /** Deletes the file and any `-journal`, `-wal` or `-shm` beside it. Absent files are not an error. */
  remove(name: string): void;
  /** Renames a closed database file. */
  rename(from: string, to: string): void;
  /** The stored key, or null when there is none. Throws when the store cannot be read. */
  readKey(): string | null;
  writeKey(key: string): void;
  randomBytes(count: number): Uint8Array;
  /** Opens or creates the file, issuing the key first when one is given. */
  open(name: string, key?: string): Connection;
  /** How many objects `sqlite_master` lists. Throws when the key does not open the file. */
  countSchemaObjects(connection: Connection): number;
  /** Writes an encrypted copy of `plaintext` to a new file `name`, keyed with `key`. */
  exportEncrypted(plaintext: Connection, name: string, key: string): void;
  close(connection: Connection): void;
}

export interface OpenedDatabase<Connection> {
  status: DatabaseStatus;
  connection: Connection;
}

interface Verified<Connection> {
  connection: Connection;
  schemaObjects: number;
}

/** A raw SQLCipher key: 32 bytes, lowercase hex. */
export function isDatabaseKey(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

export function openDatabaseFile<C>(
  files: DatabaseFiles<C>,
): OpenedDatabase<C> {
  if (files.exists(ENCRYPTED_DATABASE)) {
    const opened = openEncrypted(files);
    if (opened) return opened;
  }
  return files.exists(PLAINTEXT_DATABASE) ? upgrade(files) : create(files);
}

/**
 * For "Start fresh" on the unreadable screen. The key stays: the next launch
 * reuses it for a new file, or replaces it if it is not a key.
 */
export function discardUnreadableDatabase<C>(files: DatabaseFiles<C>): void {
  files.remove(ENCRYPTED_DATABASE);
}

/**
 * Opens the encrypted file. Returns undefined for the one case where it is not
 * the truth: empty, with a plaintext file beside it. Nothing an upgrade writes
 * is empty, so something opened it by name, and the plaintext file still
 * holds the data.
 */
function openEncrypted<C>(
  files: DatabaseFiles<C>,
): OpenedDatabase<C> | undefined {
  let key: string | null;
  try {
    key = files.readKey();
  } catch (error) {
    console.warn("Could not read the database key", error);
    return unavailable(files, "keyUnavailable");
  }
  if (key === null || !isDatabaseKey(key)) {
    return unavailable(files, "unreadable");
  }

  let verified: Verified<C>;
  try {
    verified = openVerified(files, ENCRYPTED_DATABASE, key);
  } catch (error) {
    console.warn("The database key does not open the database", error);
    return unavailable(files, "unreadable");
  }

  if (files.exists(PLAINTEXT_DATABASE)) {
    if (verified.schemaObjects === 0) {
      files.close(verified.connection);
      try {
        files.remove(ENCRYPTED_DATABASE);
      } catch (error) {
        console.warn("Could not delete an empty encrypted database", error);
        return fallBackToPlaintext(files);
      }
      return undefined;
    }
    removeLeftover(files, PLAINTEXT_DATABASE);
  }
  removeLeftover(files, PENDING_DATABASE);
  return { status: "ready", connection: verified.connection };
}

/** Moves a plaintext database into an encrypted one. Only the rename commits. */
function upgrade<C>(files: DatabaseFiles<C>): OpenedDatabase<C> {
  try {
    files.remove(PENDING_DATABASE);
    const key = usableKey(files);
    exportToPending(files, key);
    files.rename(PENDING_DATABASE, ENCRYPTED_DATABASE);
  } catch (error) {
    console.warn("Could not encrypt the database; staying on plaintext", error);
    return fallBackToPlaintext(files);
  }
  return openEncrypted(files) ?? fallBackToPlaintext(files);
}

/** A fresh install. There is no data yet, so any failure falls back. */
function create<C>(files: DatabaseFiles<C>): OpenedDatabase<C> {
  try {
    const key = usableKey(files);
    const { connection } = openVerified(files, ENCRYPTED_DATABASE, key);
    return { status: "ready", connection };
  } catch (error) {
    console.warn("Could not create an encrypted database", error);
    removeLeftover(files, ENCRYPTED_DATABASE);
    return fallBackToPlaintext(files);
  }
}

/** Writes the encrypted copy and proves it before anything depends on it. */
function exportToPending<C>(files: DatabaseFiles<C>, key: string): void {
  const original = exportFromPlaintext(files, key);
  const copy = openVerified(files, PENDING_DATABASE, key);
  files.close(copy.connection);
  if (copy.schemaObjects !== original) {
    throw new Error(
      `The encrypted copy has ${copy.schemaObjects} schema objects; the original has ${original}`,
    );
  }
}

/** Returns how many schema objects the plaintext file had. */
function exportFromPlaintext<C>(files: DatabaseFiles<C>, key: string): number {
  const plaintext = files.open(PLAINTEXT_DATABASE);
  try {
    const original = files.countSchemaObjects(plaintext);
    files.exportEncrypted(plaintext, PENDING_DATABASE, key);
    return original;
  } finally {
    files.close(plaintext);
  }
}

/** Opens a file and proves the key opens it, closing it again if not. */
function openVerified<C>(
  files: DatabaseFiles<C>,
  name: string,
  key: string,
): Verified<C> {
  const connection = files.open(name, key);
  try {
    return { connection, schemaObjects: files.countSchemaObjects(connection) };
  } catch (error) {
    files.close(connection);
    throw error;
  }
}

/**
 * The stored key if it is one. Otherwise a new key, stored before anything is
 * encrypted with it. Only reached while no encrypted file exists, so replacing
 * a stored value cannot strand any data.
 */
function usableKey<C>(files: DatabaseFiles<C>): string {
  const stored = files.readKey();
  if (stored !== null && isDatabaseKey(stored)) return stored;

  const key = Array.from(files.randomBytes(KEY_BYTES), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  files.writeKey(key);
  return key;
}

/** Opens, or creates, the plaintext file, as 1.4.0 did. The next launch tries again. */
function fallBackToPlaintext<C>(files: DatabaseFiles<C>): OpenedDatabase<C> {
  removeLeftover(files, PENDING_DATABASE);
  return { status: "ready", connection: files.open(PLAINTEXT_DATABASE) };
}

function unavailable<C>(
  files: DatabaseFiles<C>,
  status: UnavailableStatus,
): OpenedDatabase<C> {
  return { status, connection: files.open(IN_MEMORY_DATABASE) };
}

/** Deletes a file nothing needs. A failure is retried at the next launch. */
function removeLeftover<C>(files: DatabaseFiles<C>, name: string): void {
  try {
    files.remove(name);
  } catch (error) {
    console.warn(`Could not delete ${name}`, error);
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest db/__tests__/databaseFile.test.ts`
Expected: PASS, every test.

- [ ] **Step 5: Run the full checks**

Run: `npm run format && npm run typecheck && npm run lint && npm test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add db/databaseFile.ts db/__tests__/databaseFile.test.ts
git commit -m "fix: decide at launch which database file to open, and upgrade a plaintext one without ever stranding its data" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Open the encrypted database on the device

These changes go in one commit. `<SQLiteProvider>` must not outlive the old `setup.ts`: it opens `ephira.db` by name, and against the new sequence that recreates a plaintext file after every upgrade. The layout must branch on the status in the same commit, or an unreadable database runs the app against the in-memory stand-in.

**Files:**
- Create: `db/__tests__/expoSqliteImport.test.ts`
- Create: `components/DatabaseUnavailable.tsx`
- Modify: `db/operations/setup.ts` (whole file)
- Modify: `app/_layout.tsx:7`, `:13-19`, `:22-37`, `:56`, `:262-289`
- Modify: `constants/Settings.ts:1-2`
- Modify: `__tests__/helpers/testDatabase.ts` (append after `getDatabase`)
- Modify: `app.json` (`expo.android`)
- Modify: `package.json`, `package-lock.json` (via `npx expo install`)

**Interfaces:**
- Consumes: everything Task 1 produces.
- Produces, from `db/operations/setup.ts` and so from `@/db/database`:
  ```ts
  export const getDatabase: () => SQLite.SQLiteDatabase;
  export const getDatabaseStatus: () => DatabaseStatus;
  export const discardUnreadableDatabase: () => void;
  export const getDrizzleDatabase: () => ExpoSQLiteDatabase<typeof schema>;
  ```

- [ ] **Step 1: Write the failing tripwire**

Create `db/__tests__/expoSqliteImport.test.ts`:

```ts
/**
 * Only db/operations/setup.ts may import expo-sqlite.
 *
 * Opening a database by name anywhere else is how ADR 0005's upgrade gets
 * undone: <SQLiteProvider databaseName="ephira.db"> recreated an empty
 * plaintext file on every mount. The launch sequence tolerates that file, but
 * a second opener is a second set of rules for which file is the truth.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const SKIPPED = new Set([
  "node_modules",
  ".git",
  ".expo",
  "android",
  "ios",
  "docs",
  "dist",
]);

function sourceFiles(directory: string): string[] {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      if (SKIPPED.has(entry.name)) return [];
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return /\.(ts|tsx|js)$/.test(entry.name) ? [full] : [];
    });
}

it("only db/operations/setup.ts imports expo-sqlite", () => {
  const importers = sourceFiles(ROOT)
    .filter((file) =>
      /from\s+["']expo-sqlite["']|require\(\s*["']expo-sqlite["']\s*\)/.test(
        fs.readFileSync(file, "utf8"),
      ),
    )
    .map((file) => path.relative(ROOT, file));

  expect(importers).toEqual(["db/operations/setup.ts"]);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest db/__tests__/expoSqliteImport.test.ts`
Expected: FAIL, received `["app/_layout.tsx", "db/operations/setup.ts"]`.

- [ ] **Step 3: Add the dependency and the Android backup setting**

Run: `npx expo install expo-secure-store`
Expected: `package.json` gains `"expo-secure-store": "~57.0.4"` (or the current `~57.0.x`).

In `app.json`, inside `expo.android`, add after `"softwareKeyboardLayoutMode": "pan",`:

```json
      "allowBackup": false,
```

Do not add `expo-secure-store` to `plugins`, and if `npx expo install` added it there, remove it. Its plugin would set `NSFaceIDUsageDescription` over `expo-local-authentication`'s, and its only other job is Android backup rules, which `allowBackup: false` makes moot. Task 4 Step 2 checks the generated files.

- [ ] **Step 4: Replace `db/operations/setup.ts`**

```ts
/**
 * The real files, key store and SQL behind db/databaseFile.ts.
 *
 * This is the only file that imports expo-sqlite
 * (db/__tests__/expoSqliteImport.test.ts holds it to that), and tests
 * substitute it wholesale through __tests__/helpers/testDatabase.ts, so
 * nothing here runs under Jest. Task 4 of
 * docs/plans/2026-10-15-encrypt-the-database.md checks it on a device.
 */
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as schema from "@/db/schema";
import {
  type DatabaseFiles,
  type DatabaseStatus,
  type OpenedDatabase,
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
  countSchemaObjects: (connection) =>
    connection.getFirstSync<{ count: number }>(
      "SELECT count(*) AS count FROM sqlite_master",
    )?.count ?? 0,
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

export const getDatabase = () => openOnce().connection;

/**
 * Whether the database opened. Anything but "ready" means getDatabase() is an
 * empty in-memory stand-in, and nothing may query it.
 */
export const getDatabaseStatus = (): DatabaseStatus => openOnce().status;

/** Deletes an encrypted database that cannot be opened. Takes effect on restart. */
export const discardUnreadableDatabase = () => discardFrom(files);

const db = drizzle(getDatabase(), { schema });

export const getDrizzleDatabase = () => {
  return db;
};
```

- [ ] **Step 5: Delete `DATABASE_NAME`**

In `constants/Settings.ts`, delete line 1 (`export const DATABASE_NAME = "ephira.db";`) and the blank line after it. The file names now live in `db/databaseFile.ts`, and `ephira.db` no longer names the database the app uses.

- [ ] **Step 6: Mirror the new exports in the test seam**

In `__tests__/helpers/testDatabase.ts`, after the `getDatabase` export, add:

```ts
/** The device can fail to open its database; the test handle never does. */
export const getDatabaseStatus = () => "ready" as const;

/** Nothing to discard: the test handle is never unreadable. */
export const discardUnreadableDatabase = () => undefined;
```

- [ ] **Step 7: Create `components/DatabaseUnavailable.tsx`**

```tsx
import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Alert, useColorScheme, View } from "react-native";
import {
  Button,
  MD3DarkTheme as DarkTheme,
  MD3LightTheme as DefaultTheme,
  PaperProvider,
  Text,
} from "react-native-paper";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { UnavailableStatus } from "@/db/databaseFile";

const COPY: Record<UnavailableStatus, { title: string; body: string }> = {
  unreadable: {
    title: "Your data can't be opened on this phone",
    body: "ephira encrypts your data with a key that never leaves the phone that created it. This phone doesn't have that key, which happens after restoring a backup or moving to a new phone. Start fresh deletes the data that can't be opened, so you can use ephira again.",
  },
  keyUnavailable: {
    title: "ephira couldn't unlock your data",
    body: "Nothing has been changed or deleted. Close ephira completely and open it again.",
  },
};

/**
 * Shown instead of the app when the database did not open. See ADR 0005 for
 * when each status occurs.
 */
export default function DatabaseUnavailable({
  status,
  onStartFresh,
}: {
  status: UnavailableStatus;
  onStartFresh: () => void;
}) {
  const theme = useColorScheme() === "dark" ? DarkTheme : DefaultTheme;
  const [outcome, setOutcome] = useState<string | null>(null);

  // The root layout holds the splash until authentication finishes, and
  // authentication never runs while the database is unavailable.
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  const startFresh = () => {
    try {
      onStartFresh();
      setOutcome(
        "The data that couldn't be opened has been deleted. Close ephira completely and open it again to start fresh.",
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      setOutcome(
        `The data was not deleted (${reason}). Close ephira and open it again to try again.`,
      );
    }
  };

  const confirmStartFresh = () =>
    Alert.alert(
      "Delete the data that can't be opened?",
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: startFresh },
      ],
    );

  const { title, body } = COPY[status];

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: theme.colors.background }}
        >
          <View
            style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}
          >
            <Text variant="headlineSmall">{title}</Text>
            <Text variant="bodyLarge">{outcome ?? body}</Text>
            {status === "unreadable" && outcome === null && (
              <Button
                mode="contained"
                buttonColor={theme.colors.error}
                onPress={confirmStartFresh}
              >
                Start fresh
              </Button>
            )}
          </View>
          <StatusBar style="auto" />
        </SafeAreaView>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
```

- [ ] **Step 8: Split the root layout and remove `<SQLiteProvider>`**

In `app/_layout.tsx`:

1. Line 7: `import { useEffect, useState, useRef, useCallback, Suspense } from "react";` becomes `import { useEffect, useState, useRef, useCallback } from "react";`
2. In the `react-native` import (lines 13-19), delete `ActivityIndicator,`.
3. Delete line 23, `import { SQLiteProvider } from "expo-sqlite";`.
4. In the `@/constants/Settings` import, delete `DATABASE_NAME,`.
5. The `@/db/database` import becomes:
   ```ts
   import {
     discardUnreadableDatabase,
     getDatabase,
     getDatabaseStatus,
     getDrizzleDatabase,
     getSetting,
     insertSetting,
     setupEntryTypes,
   } from "@/db/database";
   import DatabaseUnavailable from "@/components/DatabaseUnavailable";
   ```
6. Replace `export default function RootLayout() {` (line 56) with:
   ```tsx
   /**
    * Shows the app, or explains why it cannot open its data.
    *
    * No hooks here. Whether the database opened is settled at import, before the
    * first render, and the hooks in AppShell must not run against the in-memory
    * stand-in getDatabase() returns when it did not.
    */
   export default function RootLayout() {
     const status = getDatabaseStatus();
     if (status !== "ready") {
       return (
         <DatabaseUnavailable
           status={status}
           onStartFresh={discardUnreadableDatabase}
         />
       );
     }
     return <AppShell />;
   }

   function AppShell() {
   ```
7. The final `return` of what is now `AppShell` (lines 262-289) becomes:
   ```tsx
     return (
       <TourProvider>
         <SpotlightOverlay />

         <PaperProvider theme={theme}>
           <SafeAreaProvider>
             <SafeAreaView
               style={{ flex: 1, backgroundColor: theme.colors.background }}
             >
               <Stack screenOptions={{ headerShown: false }}>
                 <Stack.Screen name="index" />
                 <Stack.Screen name="(onboarding)" />
                 <Stack.Screen name="(tabs)" />
                 <Stack.Screen name="(pregnancy-tabs)" />
               </Stack>

               <StatusBar style="auto" />
             </SafeAreaView>
           </SafeAreaProvider>
         </PaperProvider>
       </TourProvider>
     );
   ```

- [ ] **Step 9: Run the tripwire to verify it passes**

Run: `npx jest db/__tests__/expoSqliteImport.test.ts`
Expected: PASS.

- [ ] **Step 10: Run the full checks**

Run: `npm run format && npm run typecheck && npm run lint && npm test`
Expected: all pass. Run the whole suite, not just the new files: `setup.ts` now imports `expo-secure-store` and expo-file-system's `File`, and any test that reaches it unmocked through another path would load them under jest-expo for the first time.

- [ ] **Step 11: Commit**

```bash
git add db/operations/setup.ts db/__tests__/expoSqliteImport.test.ts components/DatabaseUnavailable.tsx app/_layout.tsx constants/Settings.ts __tests__/helpers/testDatabase.ts app.json package.json package-lock.json
git commit -m "fix: encrypt the database with a key that never leaves the device" -m "useSQLCipher only linked SQLCipher; nothing issued PRAGMA key, so ephira.db was plaintext on every install. The launch sequence from db/databaseFile.ts now runs against the real files and key store, SQLiteProvider is gone because it reopened ephira.db by name, and Android backups are off." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Docs and privacy copy

**Files:**
- Modify: `PROJECTSTRUCTURE.md` (`/app/_layout.tsx` section, `/db/` section, Testing section)
- Modify: `components/settings/PrivacyPolicy.tsx:142-149`
- Modify: `docs/src/pages/privacy.astro:38-43`

**Interfaces:** none.

- [ ] **Step 1: `PROJECTSTRUCTURE.md`**

Under `### /app/_layout.tsx`, add a bullet after "Authenticates user if needed...":

```markdown
- Shows `components/DatabaseUnavailable.tsx` instead of the app when the encrypted database cannot be opened.
```

Under `### /db/`, add a bullet at the end:

```markdown
- **The database is encrypted with SQLCipher**, using a random key held in the iOS Keychain or Android Keystore. `db/databaseFile.ts` decides at launch which file to open and upgrades a plaintext `ephira.db` from 1.4.0 or earlier into `ephira.encrypted.db`. `db/operations/setup.ts` supplies the real files, key store and SQL, and is the only file allowed to import `expo-sqlite`. See `docs/adr/0005-encrypt-the-database-with-a-device-held-key.md`.
```

Under `### Testing code that touches the database`, add to the "Two things worth knowing" list, and change "Two" to "Three":

```markdown
- **SQLCipher is not exercised.** `better-sqlite3` has no SQLCipher, so the suite proves the launch sequence in `db/databaseFile.ts` with a fake and says nothing about encryption. Whether a device's database is encrypted is checked by hand: `ephira.encrypted.db` must not begin with the bytes `SQLite format 3\0`.
```

- [ ] **Step 2: The in-app privacy policy**

In `components/settings/PrivacyPolicy.tsx`, replace from `{"\n\n"}Please note that while{" "}` through `checking your general settings to prevent this from happening.` with:

```tsx
                {"\n\n"}
                <Text
                  style={[styles.ephiraFont, { color: theme.colors.primary }]}
                >
                  ephira
                </Text>{" "}
                encrypts your data with a key that never leaves this phone. A
                backup of the phone holds nothing that can be read, and your
                data does not move to a new phone. To keep a copy when you
                change phones, export it first.
```

- [ ] **Step 3: The docs site privacy policy**

In `docs/src/pages/privacy.astro`, replace the paragraph that begins `Please note that while` with:

```html
    <p>
      <strong class="font-serif">ephira</strong> encrypts your data with a key
      that never leaves this phone. A backup of the phone holds nothing that can
      be read, and your data does not move to a new phone. To keep a copy when
      you change phones, export it first.
    </p>
```

Leave the "Last updated" date alone. #240 rewrites the policy and owns the date.

- [ ] **Step 4: Run the full checks**

Run: `npm run format && npm run typecheck && npm run lint && npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add PROJECTSTRUCTURE.md components/settings/PrivacyPolicy.tsx docs/src/pages/privacy.astro
git commit -m "docs: say where the database key lives, and that moving phones needs an export" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Verify on devices

Nothing in Jest exercises SQLCipher, expo-secure-store or the file URIs. This task is the only evidence for them. Record each result for the PR description. Steps run in this order on purpose: see Review Focus.

**Files:** none changed. Generated `ios/` and `android/` are gitignored.

- [ ] **Step 1: Build 1.4.0 on the iOS simulator and record its generated config**

```bash
git switch main
npx expo prebuild --clean --platform ios
/usr/libexec/PlistBuddy -c "Print :NSFaceIDUsageDescription" ios/ephira/Info.plist
npx expo run:ios
```

Record the `NSFaceIDUsageDescription` value. Let the app finish launching once, so migrations create `ephira.db`.

- [ ] **Step 2: Seed a day into the plaintext database**

```bash
xcrun simctl terminate booted com.capucity.ephira
APP_DATA=$(xcrun simctl get_app_container booted com.capucity.ephira data)
ls "$APP_DATA/Documents/SQLite"
sqlite3 "$APP_DATA/Documents/SQLite/ephira.db" "INSERT INTO days (date, flow_intensity, notes) VALUES ('2026-10-01', 2, 'upgrade-check');"
```

Expected: `ls` shows `ephira.db`; the insert succeeds.

- [ ] **Step 3: Upgrade to the branch (Review Focus 1)**

```bash
git switch fix/encrypt-database
npx expo prebuild --clean --platform ios
/usr/libexec/PlistBuddy -c "Print :NSFaceIDUsageDescription" ios/ephira/Info.plist
npx expo run:ios
```

Expected: the `NSFaceIDUsageDescription` value matches Step 1. After launch:

```bash
APP_DATA=$(xcrun simctl get_app_container booted com.capucity.ephira data)
ls "$APP_DATA/Documents/SQLite"
```

Expected: `ephira.encrypted.db` and nothing named `ephira.db` or `ephira.encrypting.db`. Then open the calendar at October 2026 and confirm 1 October shows flow and the note `upgrade-check`. **If `ephira.db` is still there and the calendar is empty, stop.** The file URI is wrong (Review Focus 1), and the user's data is untouched but invisible.

- [ ] **Step 4: Prove the file is encrypted (Review Focus 3)**

```bash
head -c 16 "$APP_DATA/Documents/SQLite/ephira.encrypted.db" | xxd
sqlite3 "$APP_DATA/Documents/SQLite/ephira.encrypted.db" "SELECT count(*) FROM sqlite_master;"
```

Expected: the first 16 bytes are not `5351 4c69 7465 2066 6f72 6d61 7420 3300` ("SQLite format 3\0"), and `sqlite3` fails with `file is not a database`.

- [ ] **Step 5: Relaunch twice (Review Focus 2)**

```bash
xcrun simctl terminate booted com.capucity.ephira
xcrun simctl launch booted com.capucity.ephira
```

Twice. Expected: the app opens both times and still shows 1 October.

- [ ] **Step 6: The unreadable screen and Start fresh (Review Focus 4)**

```bash
xcrun simctl terminate booted com.capucity.ephira
xcrun simctl keychain booted reset
xcrun simctl launch booted com.capucity.ephira
```

Expected: the splash goes away and "Your data can't be opened on this phone" shows. Tap **Start fresh**, then **Delete**. Expected: the close-and-reopen message. Relaunch. Expected: onboarding, an empty calendar, and `ls "$APP_DATA/Documents/SQLite"` shows a new `ephira.encrypted.db` whose first 16 bytes are not "SQLite format 3\0".

- [ ] **Step 7: Android, same upgrade**

Start an emulator (`emulator -list-avds`, then `emulator -avd <name> &`), then:

```bash
git switch main
npx expo prebuild --clean --platform android
npx expo run:android
```

After one launch, seed through a host copy (emulator images have no `sqlite3`):

```bash
adb shell am force-stop com.capucity.ephira
adb exec-out run-as com.capucity.ephira cat files/SQLite/ephira.db > "$TMPDIR/ephira.db"
sqlite3 "$TMPDIR/ephira.db" "INSERT INTO days (date, flow_intensity, notes) VALUES ('2026-10-01', 2, 'upgrade-check');"
adb push "$TMPDIR/ephira.db" /data/local/tmp/ephira.db
adb shell "cat /data/local/tmp/ephira.db | run-as com.capucity.ephira sh -c 'cat > files/SQLite/ephira.db'"
adb shell rm /data/local/tmp/ephira.db
```

The pipe is deliberate: SELinux usually stops `run-as` from reading `/data/local/tmp` directly.

Then the branch:

```bash
git switch fix/encrypt-database
npx expo prebuild --clean --platform android
grep -n 'allowBackup\|fullBackupContent\|dataExtractionRules' android/app/src/main/AndroidManifest.xml
npx expo run:android
adb shell run-as com.capucity.ephira ls files/SQLite
adb exec-out run-as com.capucity.ephira head -c 16 files/SQLite/ephira.encrypted.db | xxd
```

Expected: the manifest has `android:allowBackup="false"` (record whether backup-rule attributes appear too); `ls` shows `ephira.encrypted.db` only; the header is not "SQLite format 3\0"; the app shows 1 October with its note, and still does after `adb shell am force-stop com.capucity.ephira` and a relaunch.

- [ ] **Step 8: Record the results**

Write each step's outcome (pass, or what happened) into the PR description in Task 5. A step that could not be run is reported as not run, with the reason.

---

### Task 5: Pull request and follow-up

**Files:** none.

- [ ] **Step 1: File the import follow-up**

```bash
gh issue create --label enhancement --label needs-triage --title "Import a JSON export, so moving to a new phone keeps the data" --body-file - <<'EOF'
ADR 0005 encrypts the database with a key that never leaves the device, so a backup restored to a new phone, or a direct Android transfer, arrives with data that cannot be opened, and the app offers to start fresh. That is deliberate: a key that travelled with the backup would make the backup readable.

It leaves no way to move data between phones. The app already exports CSV, JSON and PDF (`components/settings/ExportData.tsx`). Importing the JSON export would complete the path: export on the old phone, import on the new one.

Open questions:

- Merge into existing data, or only into an empty database?
- What happens to Catalogue items the importing install does not have?
- Whether the unreadable screen should mention import once it exists.
EOF
```

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin fix/encrypt-database
gh pr create --title "Encrypt the database with a key that never leaves the device" --body-file - <<'EOF'
## What was wrong

`app.json` set `useSQLCipher: true`, which links SQLCipher, but nothing ever issued `PRAGMA key`. Unkeyed, SQLCipher is plain SQLite, so every install up to 1.4.0 has a plaintext `ephira.db`, while the README, the site and the privacy policy all say it is encrypted.

## What this does

- A random 256-bit key in the iOS Keychain or Android Keystore (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`), never in a backup. `android.allowBackup` is now `false`.
- At launch, `db/databaseFile.ts` upgrades a plaintext `ephira.db` into `ephira.encrypted.db`: export to `ephira.encrypting.db`, verify it, rename. The rename is the commit point; before it every failure falls back to the plaintext file, after it nothing does.
- An encrypted file the app cannot open shows a screen that explains why and offers **Start fresh**. Nothing is deleted without that tap.
- `<SQLiteProvider>` is gone. It reopened `ephira.db` by name, and a test now fails if anything but `db/operations/setup.ts` imports `expo-sqlite`.

Spec: `docs/adr/0005-encrypt-the-database-with-a-device-held-key.md`. Plan: `docs/plans/2026-10-15-encrypt-the-database.md`. Password-derived keys are #260.

## Verified on devices

<Task 4 results, one line per step>

Jest cannot exercise SQLCipher; the suite covers the launch sequence with a fake.

## Needs a maintainer

- **Export compliance.** `ITSAppUsesNonExemptEncryption` stays `false`. iOS SQLCipher is built with `SQLCIPHER_CRYPTO_CC` (Apple's CommonCrypto). Confirm that answer before the release that ships this.
- **Privacy policy date.** The backup paragraph changed in both copies; the "Last updated" date is left to #240.
- **Old backups.** Backups taken before this release still hold the plaintext file until the OS replaces them.
- **Version.** Not bumped here.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

Replace `<Task 4 results, one line per step>` with the recorded results before running the command.
