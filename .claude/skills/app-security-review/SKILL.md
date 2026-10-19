---
name: app-security-review
description: Review the changes since a fixed point (commit, branch, tag, or merge-base) for the ways ephira's health data has leaked or nearly leaked (encryption claimed but not applied, a database upgrade that strands or leaves plaintext, a key store taken on trust, a lock that fails open, health data reaching a log, a notification or an export, privacy claims the code does not keep). Use on every PR, as the security pass of the review loop in CONTRIBUTING.md.
---

Security review of the diff between a pinned head and a fixed point the user
supplies, scoped to what a generic security review does not cover. Two read-only
sub-agents run in parallel: one on the data at rest, one on the data in use.

A generic review is tuned for servers and the web, and ephira has no server. Its
data is a person's cycle, pregnancy and symptom history on their own phone, and the
people it must be kept from are close by. This skill carries those classes; the
classes every app shares are covered by the harness's generic security review where
one runs, and by hand in step 4 where it does not.

## Process

### 1. Pin both ends

Whatever the user said is the fixed point. If they did not name one, ask. Pin the
head too, `git rev-parse HEAD`, because the author may keep committing while the
sub-agents read. Capture the diff command once, `git diff <fixed-point>...<head>`
(three-dot, against the merge-base), and the commit list,
`git log <fixed-point>..<head> --oneline`. Sub-agents read files as
`git show <head>:<path>`, never from the working tree.

Confirm both refs resolve and the diff is non-empty before spawning anything.

### 2. The checklist

Each entry reads _what it is_, then _how to find it_. Paste the whole list into both
sub-agent prompts: the sub-agent has no other access to it.

**At rest**

- **Encryption claimed, not applied (#53, 010dab7).** Every install up to 1.4.0
  was plaintext: `useSQLCipher` linked SQLCipher, nothing issued `PRAGMA key`, and a
  PR body said the database was already encrypted. A second opener reached the
  plaintext file by name. Find it: every database open and every `expo-sqlite`
  import in the diff; only `db/operations/setup.ts` may import it
  (`db/__tests__/expoSqliteImport.test.ts`). Treat any comment or PR text saying
  "encrypted" as a claim to check against the code that keys the connection. Jest
  cannot exercise SQLCipher, so a change here needs the device check in ADR 0005:
  `ephira.encrypted.db` must not begin with `SQLite format 3\0`.
- **An upgrade that strands data or leaves plaintext (dc9f470, 1c7d1fd, 1cdf378).**
  `db/databaseFile.ts` upgrades a plaintext `ephira.db` into `ephira.encrypted.db`,
  with the rename as the commit point. Find it: for each step the diff touches, kill
  the app after it and relaunch, as `db/__tests__/databaseFile.test.ts` does, and
  say which files exist, which one opens, and whether plaintext survives. Only "file
  is not a database" may count as unreadable; an I/O error that reaches the delete
  path deletes someone's history.
- **A key store taken on trust (1cdf378).** A key write the store accepts and keeps
  nothing of, or a delete decided on a fresh install's say-so. Find it: for each key
  read and write, say what happens when the store returns null, throws, or returns a
  key that does not open the file.
- **Copies off the device (010dab7).** `allowBackup: false` in `app.json` keeps the
  database out of Android backups. Find it: any change to `app.json` and its
  config plugins, file locations or backup flags, and where the database and its staging files land
  on each platform.
- **Export files left behind (open).** CSV and JSON exports go to
  `FileSystem.cacheDirectory` and the PDF to `documentDirectory/ephira.pdf`
  (`components/settings/ExportData.tsx`, `PdfBuilder.ts`), and nothing deletes them
  after the share sheet closes. A diff that adds an export path or a new location is
  a finding unless it cleans up; the existing paths are known.

**In use**

- **A lock that fails open (9608f1a, 245733d).** The Authentication Choice is read
  synchronously on the way to the background, and one that cannot be read locks
  (`services/appLock.ts`). iOS looped the biometric prompt on `inactive` to
  `active`. Find it: for each Authentication Choice (none, biometric, password,
  unreadable) and each event (background, resume, cold start, notification tap,
  the system prompt's own `inactive`), say whether health data is visible before
  the lock screen, including in the app switcher. The password is a hash and does not yet derive the database
  key (#260, open).
- **Health data reaching a log (open).** Days with flow, Predictions and Gestational
  Age are health data, and so is any date that implies one. `hooks/useNotifications.ts` logs scheduled trigger
  dates today. Find it: every `console` call in the diff and what the value carries;
  a new one that logs an Entry, a date tied to a Cycle, or an error wrapping a row
  is a finding.
- **What the lock screen shows (open).** Notifications read like "Period Expected
  Tomorrow" (`constants/Notifications.ts`), and nothing sets their lock-screen
  visibility. Find it: for each
  notification the diff adds or changes, write the text a person holding the locked
  phone reads.
- **Privacy claims the code does not keep (1cdf378, #240).** The policy lives in
  `components/settings/PrivacyPolicy.tsx` and `docs/src/pages/privacy.astro`. Find
  it: a diff that changes what is stored, where, or what leaves the device must keep
  both true; a diff to either must be true of the code. Name the sentence and the
  code that contradicts it.
- **CI and supply chain (b4c94ed, #231, #237).** Workflow token permissions,
  untrusted event text in a `run:` line, a new dependency with native code or network
  access. Find it: for each workflow change, the permissions it grants and the inputs
  it interpolates; for each new dependency, whether it phones home.

Then one technique on top of the list, for every path the diff adds or changes that
touches health data: name the least trusted party who can reach the data through it
(a person holding the locked phone, a person who sees its lock screen, a backup or a
forensic copy of the device, another app the share sheet hands a file to) and write
the sequence that gets it to them.

A finding carries that sequence: the party, the steps, the data they end up with. A
description of the exposure is not a finding. An entry marked _open_ is a known
exposure; report a diff that widens it, not the exposure itself.

### 3. Spawn two sub-agents in parallel

Every prompt opens with: "You are read only. Write nothing under the repository,
stage nothing, change no branch. Read files as `git show <head>:<path>`. A scratch
file goes under `$TMPDIR`." Every prompt carries the diff command, the commit list,
the full checklist and the technique from step 2, and a 400-word limit on the
report.

- **At rest.** Entries under _At rest_. Brief: "For each file, key and storage
  location the diff touches, apply the entry and the technique. Report each finding
  under the entry's name with the sequence that triggers it."
- **In use.** Entries under _In use_. Brief: "Trace every value the diff shows,
  logs, notifies, exports or claims, back to where it came from and forward to who
  can read it. Report each finding under the entry's name with the value and the
  path."

### 4. Aggregate

Present the reports under `## At rest` and `## In use`, verbatim or lightly cleaned,
findings under the checklist entry names. Within each section, order findings by how
silent they are: one that leaves plaintext on disk or shows a cycle on the lock
screen without anyone noticing comes before one that fails loudly. Keep the sections
separate. End with one line per section: finding count and the most silent finding in
it. Name no winner across sections.

When the harness's generic security review did not run on this head, add a third
section, `## Generic`, from your own read of the diff: injection, secrets in code,
unsafe deserialization, and permissions the app requests but does not need.

## Why

A generic security review looks for injection, authentication bypass, secrets in
code and the like, and filters logging and on-device storage out by policy. In this
repo the worst defect was neither: every install up to 1.4.0 stored its database in
plaintext while the code and a PR said it was encrypted (#53, fixed in 010dab7), and
fixing it took six follow-ups to keep the upgrade from stranding or deleting data.
The people a period tracker must be kept from are a partner, a parent or an official
holding the phone, so the lock, the lock screen and what is left on disk matter more
here than any network path. This skill carries those classes; the shared ones go
to the tool built for them where it runs, and to step 4's `## Generic` section
where it does not.
