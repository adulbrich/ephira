# ADR 0005: Encrypt the database with a key that never leaves the device

- **Status**: Accepted
- **Date**: 2026-10-14
- **Context commit**: 749b54f
- **Amended**: 2026-10-15, during planning, implementation and code review. The commit point is a rename, "Start fresh" keeps the key, and only a key that does not open the file counts as unreadable; anything else asks for a restart. Code review added the partial-copy rule: an `ephira.encrypting.db` beside the encrypted file while `ephira.db` exists marks a copy that may be partial. See `docs/plans/2026-10-15-encrypt-the-database.md`. 2026-10-19: what Delete Data does about free pages and the key, under Consequences. 2026-10-20 (#309): Delete Data deletes the file and replaces the key, which closes the follow-up the 2026-10-19 entry left; see Consequences.

## Context

`app.json` sets `useSQLCipher: true` on the `expo-sqlite` plugin, and the README, the docs site and the in-app privacy policy all say the data is encrypted. It never was. The flag only links SQLCipher in place of stock SQLite. SQLCipher encrypts a database only after `PRAGMA key` is issued on the connection, and nothing in the repo has ever issued it (`git log -S "PRAGMA key"` is empty). Unkeyed, SQLCipher behaves exactly like SQLite, so every install up to and including 1.4.0 has a plaintext `ephira.db`.

On a locked phone the OS already encrypts the file at rest. The exposure is everywhere the file leaves that protection: Android auto-backup (`allowBackup` was unset, and Expo defaults it to `true`), iCloud backups, which Apple can read unless the user has turned on Advanced Data Protection, rooted or jailbroken devices, and forensic extraction.

Two further facts shape the fix:

- The database opens synchronously at module load. `db/operations/setup.ts` calls `openDatabaseSync`, and every file under `db/operations/` plus several hooks capture `getDrizzleDatabase()` at import.
- `app/_layout.tsx` also mounted `<SQLiteProvider databaseName="ephira.db">`, a second connection to the same file that nothing reads through `useSQLiteContext`.

## Decision

**The database is encrypted with SQLCipher using a random 256-bit key held by the OS.** The key is 32 bytes from `expo-crypto`, stored hex-encoded in `expo-secure-store` under `ephira.databaseKey` with `keychainAccessible: AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, and issued as a raw key (`PRAGMA key = "x'…'"`), so SQLCipher skips its passphrase KDF.

**The key never leaves the device.** iOS stores it as `THIS_DEVICE_ONLY`. On Android, `expo-secure-store` wraps it with a Keystore key, which cannot be exported, and `android.allowBackup` is set to `false`. A backup holds nothing readable, and a new phone starts empty.

**Three file names, and a rename is the commit point.** `ephira.db` is only ever the legacy plaintext file. An upgrade exports into `ephira.encrypting.db`, and only once that copy opens with the key and holds as many schema objects as the original is it renamed to `ephira.encrypted.db`. The invariant: **once `ephira.encrypted.db` exists, it is the source of truth, with two exceptions while `ephira.db` is still beside it: `ephira.encrypting.db` also there means the copy may be partial, and an empty encrypted file is a stray. `ephira.encrypting.db` is never the truth.** Before the rename the plaintext file is the truth, so an interrupted export is always safe to redo. After it, a plaintext file is a leftover to delete, whether the upgrade stopped before deleting it or something recreated it later by opening `ephira.db` by name.

At launch, before anything else touches the database, the sequence below runs. An `ephira.encrypting.db` is a leftover and is deleted wherever this sequence meets one, except beside `ephira.encrypted.db` while `ephira.db` exists: there it marks a copy that may be partial, and it stays until that copy is deleted.

| `ephira.db` | `ephira.encrypted.db` | Action |
| --- | --- | --- |
| absent | absent | Fresh install. Read the key, or generate and store one. Create the encrypted file. |
| present | absent | Upgrade. Read or create the key. `ATTACH` `ephira.encrypting.db` with the key, `SELECT sqlcipher_export('pending')`, `DETACH`, close. Open the copy with the key and compare its schema object count with the original's. Rename it to `ephira.encrypted.db`, open it, then delete `ephira.db` and any `-journal`, `-wal` and `-shm` beside it. An empty `ephira.db`, one the app created but never migrated, yields an empty copy that the stray rule below deletes; that launch stays on plaintext, and the next one upgrades it. |
| present | present, with `ephira.encrypting.db` still beside it | A rename that copies and then deletes did not finish, so the encrypted file may be partial. Delete it and upgrade again from the plaintext file. This row wins over the two below. |
| present | present, with schema objects | Upgrade finished but the plaintext file survived, or was recreated. Open the encrypted file and delete the plaintext one. |
| present | present, empty | A stray, created by something that opened `ephira.encrypted.db` before this sequence ran, or left by a fresh install that could not finish. Delete it and upgrade from the plaintext file. This needs a key that opens the file; without one, the `unreadable` or `temporarilyUnavailable` status below applies and nothing is deleted. |
| absent | present | Normal launch. Open with the key, then probe with `SELECT count(*) FROM sqlite_master`. |

Failures resolve to one of three statuses:

| Status | When | What the user sees |
| --- | --- | --- |
| `ready` | The database is open and readable, or the upgrade failed and the plaintext file was opened instead | The app |
| `unreadable` | The encrypted file exists and the key is absent or malformed, or SQLCipher reports that the key does not open it (`file is not a database`) | A screen explaining that the data cannot be opened on this device, with **Start fresh**, which deletes the encrypted file and asks the user to close and reopen the app. The key stays: the next launch reuses it for a new file, or replaces it if it is malformed. |
| `temporarilyUnavailable` | The encrypted file exists and reading the key throws (as opposed to returning nothing), or opening or reading the file fails for any reason other than the key: an I/O error, a lock, a full disk | A screen asking the user to close and reopen the app. No data is deleted (a leftover `ephira.encrypting.db` may be). There is no in-app retry, because every module that captured the database handle at import holds the placeholder, and only a restart re-runs the sequence. |

**A failed upgrade falls back to the plaintext file.** If reading or storing the key, the export, the comparison or the rename throws, `ephira.encrypting.db` is deleted (unless a copy that may be partial could not be deleted beside it, in which case it stays as the mark), the plaintext file opens as it did in 1.4.0, and the upgrade runs again at the next launch. A failure after a rename that finished does not fall back, unless the export it left behind cannot be deleted while `ephira.db` exists: the encrypted file is the truth by then, and a plaintext file that cannot be deleted is deleted at the next launch instead. A device stuck there stays unencrypted rather than locked out of its data. A fresh install that cannot read or store a key does the same: it creates a plaintext `ephira.db`, and the next launch upgrades it. The rule is that the app fails open while no encrypted file exists, or one is known not to be the truth (a copy that may be partial, or a file read as empty), and fails closed otherwise. An encrypted file that cannot be read is never known to be a stray, so it fails closed.

**The decision logic is its own module and takes its effects as parameters.** It receives the file checks, deletes, key reads and writes and the SQL as functions, and returns a status plus a connection. `db/operations/setup.ts` remains the only importer of `expo-sqlite` and plugs the real implementations in, so the test seam in `__tests__/helpers/testDatabase.ts` is unchanged. When the status is not `ready`, `getDatabase()` returns an in-memory connection so that module-level captures still evaluate, and `app/_layout.tsx` mounts nothing that queries until the status is `ready`.

**`<SQLiteProvider>` is removed, and only `db/operations/setup.ts` may import `expo-sqlite`.** The provider opened `ephira.db` by name, which after an upgrade recreates an empty plaintext file on every mount. A test fails if any other file imports `expo-sqlite`.

## Rationale

**Random key now, password-derived key later.** A key derived from the user's password is stronger, but it cannot exist before the user authenticates, and today the database opens at module load and the Authentication Choice is itself stored in it. Doing that restructuring here would hold the encryption fix hostage to it. It is tracked in #260 and builds on this.

**Device-bound over portable.** A key that travels with an iCloud backup travels next to the file it unlocks, so anyone who can read the backup reads the data, exactly as with no encryption. The privacy policy used to advise users to keep the app out of cloud backups; a device-bound key makes that advice unnecessary. The cost is that moving phones no longer carries data across; the remedy is export and import, not a portable key.

**`AFTER_FIRST_UNLOCK` over `WHEN_UNLOCKED`.** iOS gives the database file `NSFileProtectionCompleteUntilFirstUserAuthentication` by default. Matching the key to the file adds no new locked-phone failure modes; a stricter key would only add some without making the file stricter.

**A new file name over in-place replacement.** Replacing `ephira.db` would need a header check to tell an encrypted `ephira.db` from a plaintext one. With separate names the state is a set of `exists` checks.

**A rename as the commit point, not "both files exist means interrupted".** The first version of this decision deleted the encrypted file whenever a plaintext file sat beside it, on the reading that the export had not finished. That reading is wrong whenever anything recreates `ephira.db` after a finished upgrade, and `<SQLiteProvider>` did exactly that: the next launch would have deleted the only copy of the data. Exporting under a temporary name and renaming once the copy is verified means a file under the final name is complete whenever the rename is atomic, so its presence settles which file is the truth. There are two exceptions. A rename that copies and then deletes (Android below API 26) can leave a partial file under the final name, but it leaves `ephira.encrypting.db` beside it until the copy is complete, which marks the case. And an empty encrypted file beside a plaintext one is not the truth either: the upgrade writes an empty file only from an empty plaintext one, so the plaintext file holds at least as much, and the upgrade is redone from it.

**Fail open on upgrade, fail closed on an encrypted file.** A failed upgrade leaves the status quo, which is bad but no worse than 1.4.0. An encrypted file the app cannot open is never deleted without the user asking, unless `ephira.db` beside it still holds the data (a copy that may be partial), because "the key read threw" and "the key is gone" look alike from a distance and only one of them means the data is lost. Opening the file follows the same rule: only SQLCipher's own "file is not a database" counts as a wrong key. An I/O error, a lock or a full disk on a file whose key is right would otherwise lead the user to delete the only copy of data a restart would have opened. SQLCipher also reports a damaged first page as "file is not a database", so a corrupt file is classed as unreadable too. That is the right screen, since no restart opens it, though its wording speaks only of a missing key.

## Consequences

- Moving to a new phone starts empty. A phone restored from an iCloud backup, or a direct Android-to-Android transfer, which `allowBackup="false"` does not stop on Android 12 and later, arrives with an encrypted file and no key and shows the `unreadable` screen. An import for the existing JSON export is the follow-up.
- Backups taken before the upgrade still hold the plaintext file until the OS replaces them or they expire. Nothing in the app can reach them.
- Deleting the plaintext file is an unlink, not an overwrite. iOS per-file keys and Android file-based encryption make the freed blocks unreadable in practice.
- Delete Data replaces the database rather than emptying it (#309). It closes the connection, deletes `ephira.encrypted.db`, `ephira.encrypting.db` and `ephira.db` with their `-journal`, `-wal` and `-shm` files, stores a new random key, and opens a new file through the fresh-install row above, then migrates it and seeds the default Catalogue. Every table goes with the file, including any added later, so no list of tables has to be kept. The old ciphertext is unlinked, as above, and the key that opened it is overwritten, so a backup taken before the delete no longer opens with the key on the phone. Before this, Delete Data emptied the tables with `secure_delete` and ran `VACUUM`, and kept the key.
- The file the connection was on is deleted last, after its own `-journal`, `-wal` and `-shm` and after every other file. Until that one unlink, nothing the launch sequence would open in its place is left: a stale `ephira.db` beside the encrypted file goes first, so it cannot be upgraded into the live database. The key changes only once every file is gone, so no order of kills leaves a file the stored key does not open. A delete that fails throws before the key changes, and the launch sequence reopens the old data under the old key. A new key that is not a key throws before any file is touched. Creating the new file's tables is a step of its own: if it fails, the data is already gone, and Try Again replaces the file again. A kill after the deletes and before the key write leaves no file and the old key, and the next launch creates the new file with that key: the data is gone, but the backup case above stays open for that device. A key store that refuses the write does the same, without failing Delete Data. A key store that cannot be read at all sends the fresh install to the plaintext fallback, as for any fresh install, and the next launch upgrades it.
- Restoring a whole backup to the same phone brings the file and its key back together, and a new key does not reach that; only keeping the file out of backups would.
- Every module captured the connection at import, so `db/operations/setup.ts` hands out a proxy that forwards to whichever connection is open, and Delete Data swaps the connection underneath it.
- The Jest suite runs on `better-sqlite3` and never exercises SQLCipher. The decision module is tested with fakes. Whether the SQL encrypts is verified on a device by checking that `ephira.encrypted.db` does not begin with `SQLite format 3\0`, and that a 1.4.0 database survives the upgrade.
- `ITSAppUsesNonExemptEncryption` stays `false`. On iOS, SQLCipher is built with `SQLCIPHER_CRYPTO_CC` and uses Apple's CommonCrypto. The maintainer confirms the export-compliance answer before the release that ships this.
- The password credential is still an unsalted SHA-256 in the `settings` table, now inside the encrypted file. It remains a gate on the UI; #260 replaces it.
- On Android 7 (API 24 and 25), expo-file-system renames by copying and then deleting, so the rename is not atomic there. The source goes only once the copy is complete, so an `ephira.encrypting.db` still beside `ephira.encrypted.db` marks a copy that may be partial, whether the copy threw or the process died. While `ephira.db` exists, that copy is discarded and the upgrade redone. The same mark covers a copy that completed but whose own delete of `ephira.encrypting.db` silently failed: if that file still cannot be deleted when the encrypted file is opened, the encrypted file is discarded rather than used, since `ephira.db` holds the same data. A device whose export stays undeletable therefore stays on plaintext at every launch: nothing is lost, but nothing is encrypted either. Raising `minSdkVersion` to 26 would remove the whole case.
- A key store that keeps failing, or a file damaged in a way SQLite reports as anything but "file is not a database", leaves the user on the `temporarilyUnavailable` screen at every launch. Its copy suggests restarting the phone; nothing in the app offers more.

## When to revisit

When #260 lands, password mode derives its own key and this decision covers only the `none` and `biometric` modes. If the app ever needs a database that survives a change of phone without an export, the device-bound key is the decision to reopen, together with the backup question above.

Transferring the iOS app to another developer team changes the keychain access group, and every user would land on the `unreadable` screen. Check Apple's app-transfer notes before any transfer.

Before an expo-sqlite upgrade that changes SQLCipher's major version, open a file written by the current version on a device. The move from SQLCipher 3 to 4 made old files report "file is not a database", which this app turns into an offer to start fresh.
