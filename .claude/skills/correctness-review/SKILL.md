---
name: correctness-review
description: Sweep the changes since a fixed point (commit, branch, tag, or merge-base) for the defect classes ephira has shipped fixes for, and report each finding with the input or sequence that triggers it. Use on every PR as the correctness pass of the review loop in CONTRIBUTING.md, or whenever the question is "is it wrong" rather than "does it conform"; with `mutate`, also removes each guard in the diff and reports the ones no test catches.
---

Correctness sweep of the diff between a pinned head and a fixed point the user
supplies.
Three read-only sub-agents run in parallel, each with one way of finding things:
walking the diff for sequences, executing pure functions at their boundaries, and
checking what the diff takes on trust. An optional fourth step mutates guards in a
scratch worktree.

It answers a different question from `mattpocock-skills:code-review`, which checks
conformance; see _Why_.

## Process

### 1. Pin both ends

Whatever the user said is the fixed point. If they did not name one, ask. Pin the
head too, `git rev-parse HEAD`, because the author may keep committing while the
sub-agents read. Capture the diff command once, `git diff <fixed-point>...<head>`
(three-dot, against the merge-base), and the commit list,
`git log <fixed-point>..<head> --oneline`. Sub-agents read files as
`git show <head>:<path>`, never from the working tree.

Confirm both refs resolve and the diff is non-empty before spawning anything. Note
whether the user passed `mutate`.

### 2. Find the spec

The spec is what the "State, not sequence" entry reads: the issue the commits or the
PR reference, fetched by the workflow in `docs/agents/issue-tracker.md`, or a path
the user passed. If none exists, that entry reports "no spec".

### 3. The checklist

Each entry reads _what it is_, then _how to find it_, and names the fixes or issues
that put it here where it has them. Paste the whole list into every sub-agent
prompt: the sub-agent has no other access to it.

**Sequences**

- **Write races in a debounce or across an await (#212, #214, #216).** A guard read,
  then a timer or an awaited call, then a write that assumes the guard still holds.
  `db/loggedDay.ts` dropped an edit when the date changed inside the debounce, and
  wrote an abandoned value when the user reverted inside it or mid-write. Find it:
  every timer and `await` between a read and a write in the diff, and name the user
  action that lands in the gap.
- **Writing the value from before the change (eff3c05).** A handler that sets state
  and then persists the variable it closed over, which still holds the previous
  render's value. Find it: every save in a handler, and say which render's value it
  writes.
- **Interrupted multi-step write (7a0c6f1, dc9f470).** Stopping between parts leaves
  a state a later reader accepts: password mode written before its hash, a database
  upgrade killed between copy and rename. Find it: for each multi-step write, say
  what the next launch concludes if the app is killed after the first part.
- **Stale view after a write (38e0064, #279, #281 open).** A write that fires no change
  signal or bypasses `useLiveQuery`, a signal fired before an unawaited write lands,
  or a signal that resets UI state the user had open. Find it: for each write, name
  the screens that show that data and the signal that refreshes each.
- **Lifecycle and navigation (#272, #276, 245733d).** A cold start from a
  notification tap, a background and resume with and without a lock, and iOS's
  `inactive` to `active` that a system prompt causes. Find it: walk each of those
  sequences through the diff and say which screen the user lands on.
- **Swallowed failure with a user waiting (bcd8ca1).** An error caught and logged
  on a path where the user expects an answer: a failed export used to end in
  silence. Find it: every `catch` in the diff, and what the user sees afterwards.
- **State, not sequence (#214, #216).** An acceptance criterion that describes a
  state when the defect lives in an ordering. Find it: for each criterion in the spec, ask whether
  it mentions time; one that cannot fail on a race proves nothing about one.
- **A comment that claims safety (#53, 010dab7).** Every comment or PR text saying
  something is safe, impossible or already handled is a hypothesis: #53 said the
  database was already encrypted, and it was not until 010dab7. Find it: construct the case
  that disproves it, and report the claims that survive as well as the ones that
  fall.

**Boundaries**

- **Local day versus UTC instant (#179, #186, #187, #188, #206).** `toISOString()`
  on a local date, `new Date("YYYY-MM-DD")` parsed as UTC midnight, offset
  arithmetic, a day count across a DST change. `utils/dates.ts` owns the day
  helpers. Find it: run the function in `Pacific/Kiritimati` (UTC+14) and
  `America/Los_Angeles`, at 00:30 and 23:30 local, and across the March and
  November DST changes.
- **Domain bounds (7a0c6f1, c005c8a, #163).** Pregnancy offsets at the 42-week cap,
  where the input bound and the storage bound once disagreed and a saved week 42
  reopened as week 3; cycle history that is empty or exactly one cycle long; a
  stored setting that is `""`, `null` or `"abc"` (a blank became 0 and text NaN).
  Find it: call the function with empty, at the limit, one past it, and each
  malformed stored value.
- **Null versus empty (d7c96d1).** A nullable column compared to `""`, or a column
  the schema allows null declared non-null in a type. Find it: for each column the
  diff reads, check `db/schema.ts` for nullability and call the reader with `null`.
- **Locale and special characters (bcd8ca1).** Parsing or formatting that depends on
  the device locale, and output (CSV, PDF, notification text) given a quote, a
  comma, a newline or an emoji. Find it: run it with a non-English locale and each
  character.
- **Repeated writes (df56f57, #187, 289f21a).** A write that runs on every tap,
  launch or refresh and must converge. Find it: run it twice against the test
  database and compare the rows.

**Trust**

- **Never-executed code.** A migration, an upgrade path (a 1.4.0 plaintext
  database, a legacy filter format) or a cold-start branch that no run has touched.
  A test that imports the file is not a run. Find it: name what has to happen on a
  real device for the line to execute the first time.
- **Data integrity on device (#181, ADR 0002).** Foreign keys are off on device and
  on in tests, so a delete that orphans children fails in Jest and succeeds in the
  field. A migration runs on some devices and not others. Find it: for each delete,
  name its child rows; for each migration, say what happens when it runs twice and
  when it runs on a database that never had the bad data.
- **Reads before migrations (#249, #210).** A database read at module load or on
  mount that can run before `useMigrations` finishes, or state hydrated where one
  screen mounts instead of at launch. Find it: trace each new read back to what
  guarantees the tables exist.
- **One rule, several definitions (#186, #163, #180).** A concept from `CONTEXT.md`
  (Cycle, Prediction, Logged Day) computed again instead of reused, or a string
  matched across files that one side changed. Find it: grep for other computations
  of the same concept or literal and compare them.
- **Platform divergence (#277, #278, 86dff08).** Hardware Back, `pointerEvents` on
  Text, layout inside a ScrollView. jest-expo runs as iOS, where `BackHandler` is a
  no-op, so an Android path passing in Jest proves nothing. Find it: for each
  platform-specific API in the diff, say which platform the tests cover.
- **Dependency API drift (#192, 972b0da, d688864).** An Expo or React Native call
  whose shape moved between SDKs: expo-file-system's legacy API, notification `data`
  typing, expo-router's fork of react-navigation. Find it: check each call against
  the type definitions under `node_modules/` and the library's current docs, not
  memory.

A finding carries the concrete input or the concrete sequence of actions and calls
that triggers it. A description of the risk is not a finding.

### 4. Spawn three sub-agents in parallel

Every prompt opens with: "You are read only. Write nothing under the repository,
stage nothing, change no branch. Read files as `git show <head>:<path>`. A scratch
file goes under `$TMPDIR`." Every prompt carries the diff command, the commit list,
the full checklist from step 3, and a 400-word limit on the report.

- **Sequences.** Entries under _Sequences_. Also carries the spec from step 2. Brief:
  "For each entry, walk every hunk it applies to. Report each finding under the
  entry's name with the sequence that triggers it, action by action, call by call."
- **Boundaries.** Entries under _Boundaries_. Brief: "List every pure function the
  diff adds or changes. For each, run it with the entry's inputs and report the
  output for each input. Read nothing you can run." Give it the runner:

  ```bash
  S="$(mktemp -d "$TMPDIR/boundaries.XXXXXX")"
  echo 'module.exports = () => {};' > "$S/no-tz.cjs"
  # write $S/<name>.test.ts importing from "@/..." and logging each output
  TZ=Pacific/Kiritimati ./node_modules/.bin/jest --no-watchman \
    --rootDir "$PWD" --roots "$S" --globalSetup "$S/no-tz.cjs" \
    --modulePaths "$PWD/node_modules"
  ```

  Run it from a checkout whose working tree is the pinned head
  (`git status --porcelain` empty, `HEAD` at `<head>`): the imports resolve from
  `$PWD`, so an uncommitted edit would be what gets tested. `jest.globalSetup.js`
  pins every run to Europe/Berlin, which is why the runner swaps in a no-op setup
  and passes `TZ` itself. `--modulePaths` lets a test outside the repository
  resolve the Babel helpers a namespace or default import needs; it takes a list,
  so keep it last. A function that touches the database swaps in the in-memory one
  with
  `jest.mock("@/db/operations/setup", () => jest.requireActual("@/__tests__/helpers/testDatabase"))`
  and calls `resetTestDatabase()` first.
- **Trust.** Entries under _Trust_. Brief: "For each migration, upgrade path and
  new branch, say what would run it for the first time. For each name, shape or
  behaviour the diff takes from a library, the schema or a platform, say where you
  verified it: schema file, type definition, or document, with the path or link."

### 5. Mutate the guards (only with `mutate`)

Guard mutation runs tests against changed code, so it happens in a scratch worktree
and never in the checkout the user is working in. `git worktree add` needs the
command sandbox off, and `$TMPDIR` can name a different directory with the sandbox
on and off, so fix one absolute path `M` for the worktree and use it in every step.

1. `git worktree add --detach "$M" <head>`, then clone `node_modules` into it with
   `cp -c -R node_modules "$M/"` (an APFS clone, seconds; symlink it where clones
   are unavailable). Run `./node_modules/.bin/jest --no-watchman <a test file>` in
   `$M` once, unchanged, to prove the worktree works before trusting a result
   from it.
2. List every conditional in the diff that protects something: a null check before
   a write, a debounce guard, a lock check, a bounds check, a platform check.
3. For each guard, remove it (or invert it), run Jest on the test files for the
   module it lives in, and restore it with `git checkout -- <file>` before the next.
4. Report each guard with the tests that failed. A guard whose removal fails no
   test is **unverified here**: say so in those words, and say whether it needs a
   device (SQLCipher, Android Back, a notification cold start) to verify.
5. `git worktree remove --force "$M"`.

### 6. Aggregate

Present the reports under `## Sequences`, `## Boundaries`, `## Trust` and, if it ran,
`## Mutation`, verbatim or lightly cleaned, findings under the checklist entry
names. Keep the sections separate and their order fixed. End with one line per
section: finding count and the worst finding in that section. Name no winner across
sections.

## Why

Every class above shipped past review at least once. The debounce in
`db/loggedDay.ts` needed three fixes (#212, #214, #216), each for an ordering the
previous fix's spec described as a state. The date defects passed CI for months
because CI ran in UTC, where a local day and a UTC day agree, until b653926 pinned a
zone. `mattpocock-skills:code-review` compares the diff to the standards and the
issue; when the issue and the code share a blind spot, comparing them cannot find
it. This skill asks the diff what breaks it, which is why the sections stay
separate: a timezone failure and a lost edit are not the same kind of finding, and
ranking them against each other hides one.
