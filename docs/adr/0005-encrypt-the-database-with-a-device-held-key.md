# ADR 0005: Encrypt the database with a key that never leaves the device

- **Status**: Accepted
- **Date**: 2026-10-14
- **Context commit**: 749b54f

## Context

`app.json` sets `useSQLCipher: true` on the `expo-sqlite` plugin, and the README, the docs site and the in-app privacy policy all say the data is encrypted. It never was. The flag only links SQLCipher in place of stock SQLite. SQLCipher encrypts a database only after `PRAGMA key` is issued on the connection, and nothing in the repo has ever issued it (`git log -S "PRAGMA key"` is empty). Unkeyed, SQLCipher behaves exactly like SQLite, so every install up to and including 1.4.0 has a plaintext `ephira.db`.

On a locked phone the OS already encrypts the file at rest. The exposure is everywhere the file leaves that protection: Android auto-backup (`allowBackup` was unset, and Expo defaults it to `true`), iCloud backups, which Apple can read unless the user has turned on Advanced Data Protection, rooted or jailbroken devices, and forensic extraction.

Two further facts shape the fix:

- The database opens synchronously at module load. `db/operations/setup.ts` calls `openDatabaseSync`, and every file under `db/operations/` plus several hooks capture `getDrizzleDatabase()` at import.
- `app/_layout.tsx` also mounted `<SQLiteProvider databaseName="ephira.db">`, a second connection to the same file that nothing reads through `useSQLiteContext`.

## Decision

**The database is encrypted with SQLCipher using a random 256-bit key held by the OS.** The key is 32 bytes from `expo-crypto`, stored hex-encoded in `expo-secure-store` under `ephira.databaseKey` with `keychainAccessible: AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, and issued as a raw key (`PRAGMA key = "x'…'"`), so SQLCipher skips its passphrase KDF.

**The key never leaves the device.** iOS stores it as `THIS_DEVICE_ONLY`. On Android, `expo-secure-store` wraps it with a Keystore key, which cannot be exported, and `android.allowBackup` is set to `false`. A backup holds nothing readable, and a new phone starts empty.

**The encrypted database lives in a new file, `ephira.encrypted.db`.** `ephira.db` is only ever the legacy plaintext file. Which of the two files exist says which state the install is in, with no header sniffing and no rename. One invariant makes every state recoverable: **nothing writes to the encrypted file while the plaintext file exists.** Until the plaintext file is deleted it is the source of truth, so an interrupted upgrade is always safe to redo.

At launch, before anything else touches the database:

| `ephira.db` | `ephira.encrypted.db` | Action |
| --- | --- | --- |
| absent | absent | Fresh install. Read the key, or generate and store one. Create the encrypted file. |
| present | absent | Upgrade. Read or create the key. `ATTACH` the encrypted file with the key, `SELECT sqlcipher_export('encrypted')`, `DETACH`. Close the plaintext connection, delete `ephira.db` and any `-journal`, `-wal` and `-shm` beside it, open the encrypted file. |
| present | present | Interrupted upgrade. Delete the encrypted file and its siblings, then upgrade as above. |
| absent | present | Normal launch. Open with the key, then probe with `SELECT count(*) FROM sqlite_master`. |

Failures resolve to one of three statuses:

| Status | When | What the user sees |
| --- | --- | --- |
| `ready` | The database is open and readable, or the upgrade failed and the plaintext file was opened instead | The app |
| `unreadable` | The encrypted file exists and the key is absent, or the probe fails | A screen explaining that the data cannot be opened on this device, with **Start fresh**, which deletes the encrypted file and the key and asks the user to restart the app |
| `keyUnavailable` | Reading the key throws, as opposed to returning nothing, while only the encrypted file exists | A screen with **Try again**. Nothing is deleted. |

**A failed upgrade falls back to the plaintext file.** If storing the key, the export or the delete throws, any partial encrypted file is deleted, the plaintext file opens as it did in 1.4.0, and the upgrade runs again at the next launch. A device stuck there stays unencrypted rather than locked out of its data. A fresh install that cannot read or store a key does the same: it creates a plaintext `ephira.db`, and the next launch upgrades it. The rule is that the app fails open while no encrypted file exists, and fails closed once one does.

**The decision logic is its own module and takes its effects as parameters.** It receives the file checks, deletes, key reads and writes and the SQL as functions, and returns a status plus a connection. `db/operations/setup.ts` remains the only importer of `expo-sqlite` and plugs the real implementations in, so the test seam in `__tests__/helpers/testDatabase.ts` is unchanged. When the status is not `ready`, `getDatabase()` returns an in-memory connection so that module-level captures still evaluate, and `app/_layout.tsx` mounts nothing that queries until the status is `ready`.

**`<SQLiteProvider>` is removed.** It would open the encrypted file without a key.

## Rationale

**Random key now, password-derived key later.** A key derived from the user's password is stronger, but it cannot exist before the user authenticates, and today the database opens at module load and the Authentication Choice is itself stored in it. Doing that restructuring here would hold the encryption fix hostage to it. It is tracked in #260 and builds on this.

**Device-bound over portable.** A key that travels with an iCloud backup travels next to the file it unlocks, so anyone who can read the backup reads the data, exactly as with no encryption. The privacy policy already advises users to keep the app out of cloud backups. The cost is that moving phones no longer carries data across; the remedy is export and import, not a portable key.

**`AFTER_FIRST_UNLOCK` over `WHEN_UNLOCKED`.** iOS gives the database file `NSFileProtectionCompleteUntilFirstUserAuthentication` by default. Matching the key to the file adds no new locked-phone failure modes; a stricter key would only add some without making the file stricter.

**A new file name over in-place replacement.** Replacing `ephira.db` would need a rename that overwrites an open database's file and a header check to tell an encrypted `ephira.db` from a plaintext one. Two names make the state a pair of `exists` checks.

**Fail open on upgrade, fail closed on an encrypted file.** A failed upgrade leaves the status quo, which is bad but no worse than 1.4.0. An encrypted file the app cannot open is never deleted without the user asking, because "the key read threw" and "the key is gone" look alike from a distance and only one of them means the data is lost.

## Consequences

- Moving to a new phone starts empty. A phone restored from an iCloud backup, or a direct Android-to-Android transfer, which `allowBackup="false"` does not stop on Android 12 and later, arrives with an encrypted file and no key and shows the `unreadable` screen. An import for the existing JSON export is the follow-up.
- Backups taken before the upgrade still hold the plaintext file until the OS replaces them or they expire. Nothing in the app can reach them.
- Deleting the plaintext file is an unlink, not an overwrite. iOS per-file keys and Android file-based encryption make the freed blocks unreadable in practice.
- The Jest suite runs on `better-sqlite3` and never exercises SQLCipher. The decision module is tested with fakes. Whether the SQL encrypts is verified on a device by checking that `ephira.encrypted.db` does not begin with `SQLite format 3\0`, and that a 1.4.0 database survives the upgrade.
- `ITSAppUsesNonExemptEncryption` stays `false`. On iOS, SQLCipher is built with `SQLCIPHER_CRYPTO_CC` and uses Apple's CommonCrypto. The maintainer confirms the export-compliance answer before the release that ships this.
- The password credential is still an unsalted SHA-256 in the `settings` table, now inside the encrypted file. It remains a gate on the UI; #260 replaces it.

## When to revisit

When #260 lands, password mode derives its own key and this decision covers only the `none` and `biometric` modes. If the app ever needs a database that survives a change of phone without an export, the device-bound key is the decision to reopen, together with the backup question above.
