# db

- **Modules here own the rules.** `db/loggedDay.ts` owns loading and saving a
  Logged Day, including the debounce and its guards; `db/catalogue.ts` owns what
  the user can choose from. Components and hooks call them and hold no rules of
  their own.
- **Schema migrations are generated; data migrations are written by hand.**
  Change `db/schema.ts` and run `npx drizzle-kit generate` for DDL. A migration
  that repairs or moves rows touches four files: the `.sql` file, a
  `drizzle/meta/_journal.json` entry, a snapshot copied from the previous one
  with a fresh `id` and the previous `id` as `prevId`, and the import in
  `drizzle/migrations.js` (docs/adr/0002). `scripts/check-migrations.mjs` checks
  that the four agree.
- **A migration on `origin/main` has shipped.** Devices that ran it never run it
  again, so write the next numbered migration instead of editing it. Every data
  migration is idempotent and has a test, because it runs on some devices and
  not others; `db/__tests__/orphanedEntriesMigration.test.ts` is the pattern.
- **Foreign keys are off on device and on in tests.** A delete that orphans
  child rows passes on a phone and fails in Jest. Delete children first.
- **The database is encrypted with SQLCipher**, with a random key held in the
  iOS Keychain or Android Keystore (docs/adr/0005). `db/databaseFile.ts` decides
  at launch which file to open and upgrades a plaintext `ephira.db` from 1.4.0
  or earlier into `ephira.encrypted.db`. `db/operations/setup.ts` supplies the
  real files, key store and SQL, and is the only file that imports
  `expo-sqlite` (`db/__tests__/expoSqliteImport.test.ts` holds it there). Jest
  cannot exercise SQLCipher; ADR 0005 has the device check.
