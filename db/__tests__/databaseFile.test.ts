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
  WrongKeyError,
  discardUnreadableDatabase,
  isDatabaseKey,
  openDatabaseFile,
} from "@/db/databaseFile";

type FakeFile = { key: string | null; schemaObjects: number; days: string[] };
type FakeConnection = { name: string; key: string | null };
type Step =
  | "readKey"
  | "writeKey"
  | "export"
  | "rename"
  | "renameAfterMoving"
  | "renameCopyFails"
  | `remove:${string}`
  | `open:${string}`
  | `count:${string}`;

/**
 * A phone's database directory and key store, in memory.
 *
 * A file opened with the wrong key, or a plaintext file opened with any key,
 * throws WrongKeyError when its schema objects are counted, which is how the
 * adapter reports SQLCipher's `file is not a database`.
 */
class FakeDevice implements DatabaseFiles<FakeConnection> {
  readonly files = new Map<string, FakeFile>();
  readonly connections = new Set<FakeConnection>();
  readonly failing = new Set<Step>();
  storedKey: string | null;
  /** Makes the export drop a table, as an incomplete copy would. */
  shortExport = false;
  /** Runs once the rename has moved the file, before anything reads it. */
  afterRename: (() => void) | undefined;
  /** Makes the key store accept a write and keep nothing, as a failing keychain could. */
  dropKeyWrites = false;
  /** Runs after every change to the files or the key, as a killed process would leave them. */
  onEffect: (() => void) | undefined;

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

  /** The files and key as they stand, copied, so a new device can start from them. */
  snapshot(): { files: Record<string, FakeFile>; storedKey: string | null } {
    return {
      files: JSON.parse(JSON.stringify(Object.fromEntries(this.files))),
      storedKey: this.storedKey,
    };
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
    this.onEffect?.();
  }

  rename(from: string, to: string) {
    this.fail("rename");
    const file = this.file(from);
    if (this.failing.has("renameCopyFails")) {
      // A rename that copies and then deletes (Android below API 26), stopped
      // part-way: the first page made it across, the rows did not, and the
      // source is still there.
      this.files.set(to, { ...file, days: [] });
      this.onEffect?.();
      throw new Error("rename copy failed");
    }
    this.files.delete(from);
    this.files.set(to, file);
    this.onEffect?.();
    this.afterRename?.();
    this.fail("renameAfterMoving");
  }

  readKey() {
    this.fail("readKey");
    return this.storedKey;
  }

  writeKey(key: string) {
    this.fail("writeKey");
    if (!this.dropKeyWrites) this.storedKey = key;
    this.onEffect?.();
  }

  randomBytes(count: number) {
    return Uint8Array.from({ length: count }, (_, index) => index);
  }

  open(name: string, key?: string) {
    this.fail(`open:${name}`);
    if (name !== IN_MEMORY_DATABASE && !this.files.has(name)) {
      this.files.set(name, { key: key ?? null, schemaObjects: 0, days: [] });
      this.onEffect?.();
    }
    const connection = { name, key: key ?? null };
    this.connections.add(connection);
    return connection;
  }

  countSchemaObjects(connection: FakeConnection) {
    if (connection.name === IN_MEMORY_DATABASE) return 0;
    this.fail(`count:${connection.name}`);
    const file = this.file(connection.name);
    if (file.key !== connection.key) throw new WrongKeyError();
    return file.schemaObjects;
  }

  exportEncrypted(plaintext: FakeConnection, name: string, key: string) {
    const source = this.file(plaintext.name);
    if (this.failing.has("export")) {
      // ATTACH has already created the file; the copy stops part-way.
      this.files.set(name, { key, schemaObjects: 3, days: [] });
      this.onEffect?.();
      throw new Error("export failed");
    }
    this.files.set(name, {
      key,
      schemaObjects: source.schemaObjects - (this.shortExport ? 1 : 0),
      days: [...source.days],
    });
    this.onEffect?.();
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

  it("creates a plaintext file when the new encrypted file cannot be read, and upgrades it at the next launch", () => {
    const device = new FakeDevice({});
    device.failing.add(`count:${ENCRYPTED_DATABASE}`);

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("ready");
    expect(opened.connection).toEqual({ name: PLAINTEXT_DATABASE, key: null });
    expect(device.names()).toEqual([PLAINTEXT_DATABASE, ENCRYPTED_DATABASE]);
    expectOnlyOpen(device, opened);

    // The session ran migrations and logged a day on the plaintext file.
    device.files.set(PLAINTEXT_DATABASE, legacyDatabase());
    device.restart();
    const relaunched = openDatabaseFile(device);

    expect(relaunched.status).toBe("ready");
    expect(device.names()).toEqual([ENCRYPTED_DATABASE]);
    expect(device.file(ENCRYPTED_DATABASE)).toEqual(
      encryptedDatabase(GENERATED_KEY),
    );
    expectOnlyOpen(device, relaunched);
  });

  it("creates a plaintext file when the key store does not keep the key", () => {
    const device = new FakeDevice({});
    device.dropKeyWrites = true;

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("ready");
    expect(device.names()).toEqual([PLAINTEXT_DATABASE]);
    expect(opened.connection).toEqual({ name: PLAINTEXT_DATABASE, key: null });
    expectOnlyOpen(device, opened);
  });

  it("deletes a leftover export", () => {
    const device = new FakeDevice({ [PENDING_DATABASE]: emptyFile(KEY) }, KEY);

    const opened = openDatabaseFile(device);

    expect(device.names()).toEqual([ENCRYPTED_DATABASE]);
    expectOnlyOpen(device, opened);
  });
});

describe("upgrading a plaintext database", () => {
  it("keeps the plaintext file when a copying rename fails part-way", () => {
    const device = new FakeDevice({ [PLAINTEXT_DATABASE]: legacyDatabase() });
    device.failing.add("renameCopyFails");

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("ready");
    expect(opened.connection).toEqual({ name: PLAINTEXT_DATABASE, key: null });
    expect(device.names()).toEqual([PLAINTEXT_DATABASE]);
    expect(device.file(PLAINTEXT_DATABASE)).toEqual(legacyDatabase());
    expectOnlyOpen(device, opened);
  });

  it("keeps the mark when a copying rename fails part-way and its copy cannot be deleted", () => {
    const device = new FakeDevice({ [PLAINTEXT_DATABASE]: legacyDatabase() });
    device.failing.add("renameCopyFails");
    device.failing.add(`remove:${ENCRYPTED_DATABASE}`);

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("ready");
    expect(opened.connection).toEqual({ name: PLAINTEXT_DATABASE, key: null });
    expect(device.names()).toEqual([
      PLAINTEXT_DATABASE,
      ENCRYPTED_DATABASE,
      PENDING_DATABASE,
    ]);
    expect(device.file(PLAINTEXT_DATABASE)).toEqual(legacyDatabase());
    expectOnlyOpen(device, opened);

    device.restart();
    openDatabaseFile(device);

    expect(device.names()).toEqual([ENCRYPTED_DATABASE]);
    expect(device.file(ENCRYPTED_DATABASE)).toEqual(
      encryptedDatabase(GENERATED_KEY),
    );
  });

  it("keeps the mark of a partial copy when the copy cannot be deleted", () => {
    const partial = { key: KEY, schemaObjects: 14, days: [] };
    const device = new FakeDevice(
      {
        [PLAINTEXT_DATABASE]: legacyDatabase(),
        [PENDING_DATABASE]: encryptedDatabase(KEY),
        [ENCRYPTED_DATABASE]: partial,
      },
      KEY,
    );
    device.failing.add(`remove:${ENCRYPTED_DATABASE}`);

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("ready");
    expect(opened.connection).toEqual({ name: PLAINTEXT_DATABASE, key: null });
    expect(device.names()).toEqual([
      PLAINTEXT_DATABASE,
      ENCRYPTED_DATABASE,
      PENDING_DATABASE,
    ]);
    expect(device.file(PLAINTEXT_DATABASE)).toEqual(legacyDatabase());
    expectOnlyOpen(device, opened);

    device.restart();
    const relaunched = openDatabaseFile(device);

    expect(device.names()).toEqual([ENCRYPTED_DATABASE]);
    expect(device.file(ENCRYPTED_DATABASE)).toEqual(encryptedDatabase(KEY));
    expectOnlyOpen(device, relaunched);
  });

  it("redoes an upgrade whose copying rename was killed part-way", () => {
    const device = new FakeDevice(
      {
        [PLAINTEXT_DATABASE]: legacyDatabase(),
        [PENDING_DATABASE]: encryptedDatabase(KEY),
        [ENCRYPTED_DATABASE]: { key: KEY, schemaObjects: 14, days: [] },
      },
      KEY,
    );

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("ready");
    expect(device.names()).toEqual([ENCRYPTED_DATABASE]);
    expect(device.file(ENCRYPTED_DATABASE)).toEqual(encryptedDatabase(KEY));
    expectOnlyOpen(device, opened);
  });

  it("stays on an empty plaintext file until it has tables, then upgrades", () => {
    const device = new FakeDevice({ [PLAINTEXT_DATABASE]: emptyFile(null) });

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("ready");
    expect(opened.connection).toEqual({ name: PLAINTEXT_DATABASE, key: null });
    expect(device.names()).toEqual([PLAINTEXT_DATABASE]);
    expectOnlyOpen(device, opened);

    // Migrations ran on the plaintext file during that launch.
    device.files.set(PLAINTEXT_DATABASE, legacyDatabase());
    device.restart();
    const relaunched = openDatabaseFile(device);

    expect(device.names()).toEqual([ENCRYPTED_DATABASE]);
    expect(device.file(ENCRYPTED_DATABASE)).toEqual(
      encryptedDatabase(GENERATED_KEY),
    );
    expectOnlyOpen(device, relaunched);
  });

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

  it.each(["readKey", "writeKey"] as const)(
    "keeps the plaintext file when %s fails during an upgrade",
    (step) => {
      const device = new FakeDevice({
        [PLAINTEXT_DATABASE]: legacyDatabase(),
      });
      device.failing.add(step);

      const opened = openDatabaseFile(device);

      expect(opened.status).toBe("ready");
      expect(device.names()).toEqual([PLAINTEXT_DATABASE]);
      expect(device.file(PLAINTEXT_DATABASE)).toEqual(legacyDatabase());
      expect(opened.connection).toEqual({
        name: PLAINTEXT_DATABASE,
        key: null,
      });
      expectOnlyOpen(device, opened);
    },
  );

  it("keeps the plaintext file when the key store does not keep the key", () => {
    const device = new FakeDevice({ [PLAINTEXT_DATABASE]: legacyDatabase() });
    device.dropKeyWrites = true;

    const opened = openDatabaseFile(device);

    expect(device.names()).toEqual([PLAINTEXT_DATABASE]);
    expect(device.file(PLAINTEXT_DATABASE)).toEqual(legacyDatabase());
    expect(opened.connection).toEqual({ name: PLAINTEXT_DATABASE, key: null });
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

  it("opens the encrypted file when the rename moved it and then threw", () => {
    const device = new FakeDevice({ [PLAINTEXT_DATABASE]: legacyDatabase() });
    device.failing.add("renameAfterMoving");

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("ready");
    expect(opened.connection).toEqual({
      name: ENCRYPTED_DATABASE,
      key: GENERATED_KEY,
    });
    expect(device.names()).toEqual([ENCRYPTED_DATABASE]);
    expectOnlyOpen(device, opened);
  });

  it("never falls back to the plaintext file once the rename has happened", () => {
    const device = new FakeDevice({ [PLAINTEXT_DATABASE]: legacyDatabase() });
    device.afterRename = () => device.failing.add("readKey");

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("temporarilyUnavailable");
    expect(opened.connection.name).toBe(IN_MEMORY_DATABASE);
    expect(device.names()).toEqual([PLAINTEXT_DATABASE, ENCRYPTED_DATABASE]);
    expect(device.file(ENCRYPTED_DATABASE)).toEqual(
      encryptedDatabase(GENERATED_KEY),
    );
    expectOnlyOpen(device, opened);
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
  ])("deletes a plaintext file beside it when %s", (_, plaintext) => {
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
  });

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

  it("deletes a leftover export even when the database is unreadable", () => {
    const device = new FakeDevice(
      {
        [ENCRYPTED_DATABASE]: encryptedDatabase(OTHER_KEY),
        [PENDING_DATABASE]: emptyFile(KEY),
      },
      KEY,
    );

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("unreadable");
    expect(device.names()).toEqual([ENCRYPTED_DATABASE]);
    expect(device.file(ENCRYPTED_DATABASE)).toEqual(
      encryptedDatabase(OTHER_KEY),
    );
    expectOnlyOpen(device, opened);
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

  it("is temporarily unavailable when the key store throws, and deletes nothing", () => {
    const device = new FakeDevice(
      { [ENCRYPTED_DATABASE]: encryptedDatabase() },
      KEY,
    );
    device.failing.add("readKey");

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("temporarilyUnavailable");
    expect(opened.connection.name).toBe(IN_MEMORY_DATABASE);
    expect(device.names()).toEqual([ENCRYPTED_DATABASE]);
    expectOnlyOpen(device, opened);
  });

  it("falls back to the plaintext file when an empty encrypted file beside it cannot be deleted", () => {
    const device = new FakeDevice(
      {
        [PLAINTEXT_DATABASE]: legacyDatabase(),
        [ENCRYPTED_DATABASE]: emptyFile(KEY),
      },
      KEY,
    );
    device.failing.add(`remove:${ENCRYPTED_DATABASE}`);

    const opened = openDatabaseFile(device);

    expect(opened.status).toBe("ready");
    expect(opened.connection).toEqual({ name: PLAINTEXT_DATABASE, key: null });
    expect(device.file(PLAINTEXT_DATABASE)).toEqual(legacyDatabase());
    expectOnlyOpen(device, opened);
  });

  it.each([
    `open:${ENCRYPTED_DATABASE}`,
    `count:${ENCRYPTED_DATABASE}`,
  ] as const)(
    "is temporarily unavailable when %s fails for a reason other than the key, and deletes nothing",
    (step) => {
      const device = new FakeDevice(
        { [ENCRYPTED_DATABASE]: encryptedDatabase() },
        KEY,
      );
      device.failing.add(step);

      const opened = openDatabaseFile(device);

      expect(opened.status).toBe("temporarilyUnavailable");
      expect(opened.connection.name).toBe(IN_MEMORY_DATABASE);
      expect(device.names()).toEqual([ENCRYPTED_DATABASE]);
      expect(device.file(ENCRYPTED_DATABASE)).toEqual(encryptedDatabase());
      expectOnlyOpen(device, opened);
    },
  );
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

describe("a process killed after any step of an upgrade", () => {
  it("leaves a device whose next launch still opens the data", () => {
    const device = new FakeDevice({ [PLAINTEXT_DATABASE]: legacyDatabase() });
    const states: ReturnType<FakeDevice["snapshot"]>[] = [];
    device.onEffect = () => states.push(device.snapshot());

    openDatabaseFile(device);

    // At least: delete a leftover export, store the key, export, rename,
    // delete the plaintext file, delete a leftover export.
    expect(states.length).toBeGreaterThanOrEqual(6);
    for (const state of states) {
      const relaunched = new FakeDevice(state.files, state.storedKey);

      const opened = openDatabaseFile(relaunched);

      expect(opened.status).toBe("ready");
      expect(relaunched.file(opened.connection.name).days).toEqual([
        "2026-10-01",
      ]);
      expectOnlyOpen(relaunched, opened);
    }
  });
});
