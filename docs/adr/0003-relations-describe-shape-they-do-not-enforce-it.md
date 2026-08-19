# ADR 0003: Relations describe shape; the device does not enforce them

- **Status**: Accepted
- **Date**: 2026-08-19
- **Context commit**: c72cbe1

## Context

#220 asked for `loadLoggedDay` to load a Day and its entries in one query instead of four. That needs drizzle `relations()` declared in `db/schema.ts`, because without them `db.query.days.findFirst({ with: … })` does not exist.

Declaring them is mechanical. What is not mechanical is what changes about reading the result.

The four queries being replaced were `innerJoin`s. An `innerJoin` against the catalogue table drops any entry whose catalogue row is missing, silently and for free. A relational `with` does the opposite: the entry comes back with its `one(...)` side set to `null`.

Those rows exist. ADR 0002 records why: the app ships no `PRAGMA foreign_keys` anywhere, so foreign keys are **off on device**, and `setupEntryTypes` stranded `symptom_entries`, `mood_entries` and `medication_entries` rows pointing at deleted catalogue ids. `drizzle/0004_orphaned_entries_cleanup.sql` cleans up the ones that already happened; nothing prevents a future path from making more.

The naive rewrite was written, and it crashed:

```
TypeError: Cannot read properties of null (reading 'name')
  > symptoms: day.symptomEntries.map((entry) => entry.symptom.name),
```

That is a crash on opening a day, on ordinary device data, in a shipped release.

## Decision

**`relations()` are declared in `db/schema.ts` and are understood as a description of shape, not as a constraint.** Every reader of a `one(...)` side treats it as possibly absent, regardless of what the foreign key column says or what the types say.

`loadLoggedDay` does this through `nameOf` and `loggedNames`, which skip an entry whose catalogue row is gone — restoring, explicitly, what `innerJoin` was doing implicitly.

**Foreign keys stay off on device**, per ADR 0002. This decision does not reopen that.

## Rationale

The trap is that nothing warns you. The FK columns are `.notNull()`, so the shape reads as guaranteed, and `npm run typecheck` passes on the crashing version. The test suite does not catch it either, and deliberately so: `__tests__/helpers/testDatabase.ts` runs with `PRAGMA foreign_keys = ON`, which is stricter than the device on purpose. Constraints the device does not have cannot produce, in a test, the rows the device does have.

`withForeignKeysOff` exists for exactly this and no other reason: reproducing device state a test cannot otherwise reach. `db/__tests__/loggedDay.test.ts` uses it to delete a Symptom out from under a live entry and assert the day still loads. That test passed against the old `innerJoin` code and failed against the first relational rewrite, which is the whole reason it is worth having.

Turning the constraints on instead would make this decision unnecessary, and is a much larger change: it would have to succeed against every existing install, including ones already holding violating rows, at the moment the database opens.

## Consequences

- A relational query is one statement, but it is a statement built out of `json_group_array` and `json_array` — SQLite's JSON1 functions. `expo-sqlite` vendors SQLite 3.50.3 with JSON built in and nothing sets `SQLITE_OMIT_JSON`, so this is available. It is a dependency to keep in mind on an SDK upgrade (#232).
- Query count is now asserted, not asserted-about. `recordQueries` in the test helper collects the SQL drizzle issues, and `loadLoggedDay` has a test pinning it at one. Nothing else in the file would notice an N+1 creeping back.
- Relations are exported from `db/schema.ts` rather than declared next to a query, so both drizzle handles — `db/operations/setup.ts` on device and the test seam under jest — pick them up from their existing `import * as schema`. Neither had to change.

## When to revisit

If `PRAGMA foreign_keys = ON` is ever shipped, the null-handling here becomes dead defensiveness and should go. That is a change to ADR 0002 first.
