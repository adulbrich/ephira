/**
 * Which database file to open at launch, and how a plaintext one becomes
 * encrypted. See docs/adr/0005-encrypt-the-database-with-a-device-held-key.md.
 *
 * This module decides; db/operations/setup.ts supplies the files, the key
 * store and the SQL. Keeping every effect a parameter is what lets each state
 * and each failure be tested without SQLCipher, which Jest does not have.
 *
 * The invariant everything here protects: once ENCRYPTED_DATABASE exists, and
 * no PENDING_DATABASE beside it says the copy may be partial, it is the source
 * of truth. PENDING_DATABASE never is. Before the rename that creates it, the
 * plaintext file is the truth and every failure falls back to it. After,
 * nothing falls back.
 */

/** The legacy plaintext database, written by every release up to 1.4.0. */
export const PLAINTEXT_DATABASE = "ephira.db";
/**
 * An export in progress, never the truth. Beside ENCRYPTED_DATABASE while the
 * plaintext file exists, it marks a copy that may be partial, and it stays
 * until that copy is gone. Anywhere else it is a leftover.
 */
export const PENDING_DATABASE = "ephira.encrypting.db";
/** The encrypted database. */
export const ENCRYPTED_DATABASE = "ephira.encrypted.db";
/** What the app holds when it cannot open its data, so imports still evaluate. */
export const IN_MEMORY_DATABASE = ":memory:";

const KEY_BYTES = 32;

export type DatabaseStatus = "ready" | "unreadable" | "temporarilyUnavailable";

export type UnavailableStatus = Exclude<DatabaseStatus, "ready">;

/**
 * Thrown by DatabaseFiles.countSchemaObjects when the key does not open the
 * file. Every other failure to read it means "not right now", and nothing may
 * be deleted on the strength of it.
 */
export class WrongKeyError extends Error {
  constructor() {
    super("The key does not open this database");
    this.name = "WrongKeyError";
  }
}

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
  /**
   * How many objects `sqlite_master` lists. Throws WrongKeyError when the key
   * does not open the file, and any other error when it cannot be read now.
   */
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
    const opened = copyMayBePartial(files)
      ? discardEncryptedCopy(files)
      : openEncrypted(files);
    if (opened) return opened;
  }
  return files.exists(PLAINTEXT_DATABASE) ? upgrade(files) : create(files);
}

/**
 * Whether an encrypted file may be a partial copy. A rename that copies and
 * then deletes (expo-file-system below Android API 26) keeps the export under
 * its temporary name until the copy is complete, so both names present while
 * the plaintext file still exists mean the copy may not have finished.
 */
function copyMayBePartial<C>(files: DatabaseFiles<C>): boolean {
  return files.exists(PENDING_DATABASE) && files.exists(PLAINTEXT_DATABASE);
}

/**
 * Deletes an encrypted file that is not the truth (a copy that may be partial,
 * or an empty stray) so the upgrade runs again from the plaintext file.
 * Returns undefined when that can go ahead. If the delete fails, the app stays
 * on plaintext, and fallBackToPlaintext keeps the export beside it, so the
 * next launch still knows the copy is not to be trusted.
 */
function discardEncryptedCopy<C>(
  files: DatabaseFiles<C>,
): OpenedDatabase<C> | undefined {
  try {
    files.remove(ENCRYPTED_DATABASE);
  } catch (error) {
    console.warn(
      "Could not delete an encrypted copy that is not the truth",
      error,
    );
    return fallBackToPlaintext(files);
  }
  return undefined;
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
 * the truth: empty, with a plaintext file beside it. An upgrade writes an
 * empty file only from an empty plaintext one, so either way the plaintext
 * file holds at least as much, and the upgrade is redone from it.
 */
function openEncrypted<C>(
  files: DatabaseFiles<C>,
): OpenedDatabase<C> | undefined {
  removeLeftover(files, PENDING_DATABASE);

  let key: string | null;
  try {
    key = files.readKey();
  } catch (error) {
    console.warn("Could not read the database key", error);
    return unavailable(files, "temporarilyUnavailable");
  }
  if (key === null || !isDatabaseKey(key)) {
    return unavailable(files, "unreadable");
  }

  let verified: Verified<C>;
  try {
    verified = openVerified(files, ENCRYPTED_DATABASE, key);
  } catch (error) {
    if (error instanceof WrongKeyError) {
      console.warn("The database key does not open the database", error);
      return unavailable(files, "unreadable");
    }
    console.warn("Could not open the encrypted database", error);
    return unavailable(files, "temporarilyUnavailable");
  }

  if (files.exists(PLAINTEXT_DATABASE)) {
    if (verified.schemaObjects === 0) {
      files.close(verified.connection);
      return discardEncryptedCopy(files);
    }
    removeLeftover(files, PLAINTEXT_DATABASE);
  }
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
    if (!files.exists(ENCRYPTED_DATABASE)) {
      console.warn(
        "Could not encrypt the database; staying on plaintext",
        error,
      );
      return fallBackToPlaintext(files);
    }
    // A rename that moved the file and then threw has still committed. One
    // that copied part of it and then threw has not.
    if (copyMayBePartial(files)) {
      console.warn(
        "The encrypted copy may be partial; staying on plaintext",
        error,
      );
      return discardEncryptedCopy(files) ?? fallBackToPlaintext(files);
    }
    console.warn(
      "The encrypted database moved into place with an error",
      error,
    );
  }
  return openEncrypted(files) ?? fallBackToPlaintext(files);
}

/**
 * A fresh install. There is no data yet, so any failure falls back. An
 * encrypted file it created is left in place: deleting it here would trust an
 * `exists` that said there was none, and the next launch removes it anyway
 * once it reads as empty beside the plaintext file.
 */
function create<C>(files: DatabaseFiles<C>): OpenedDatabase<C> {
  try {
    const key = usableKey(files);
    const { connection } = openVerified(files, ENCRYPTED_DATABASE, key);
    removeLeftover(files, PENDING_DATABASE);
    return { status: "ready", connection };
  } catch (error) {
    console.warn("Could not create an encrypted database", error);
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
  // Prove the store keeps it before anything is encrypted with it.
  if (files.readKey() !== key) {
    throw new Error("The key store did not keep the database key");
  }
  return key;
}

/**
 * Opens, or creates, the plaintext file, as 1.4.0 did. The next launch tries
 * again. A leftover export is deleted only when no encrypted file is there for
 * it to vouch against.
 */
function fallBackToPlaintext<C>(files: DatabaseFiles<C>): OpenedDatabase<C> {
  if (!files.exists(ENCRYPTED_DATABASE)) {
    removeLeftover(files, PENDING_DATABASE);
  }
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
