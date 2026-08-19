# Plan: deepening the logged day

**Date**: 2026-08-18 · **Base commit**: 249566d · **Status**: ready to execute

Derived from an architecture review of the whole codebase and a design interview covering twenty-nine decisions. This document carries the sequencing and the reasoning; the individual pieces of work are GitHub issues on `adulbrich/ephira`.

Vocabulary is per `CONTEXT.md` for the domain and `docs/agents/domain.md` for the architecture. The one refactor deliberately **not** in this plan is recorded in `docs/adr/0001-keep-cycle-and-pregnancy-modes-separate.md`.

## The problem in one paragraph

The app has roughly 17,000 lines and four test files, none of which cross the database seam. That is not a discipline failure, it is a shape consequence: `services/cyclePredictionLogic.ts` and `constants/CyclePhases.ts` are the two well-tested modules precisely because they take data and return data, while everything else reaches for a module-level Zustand store or an Expo SQLite handle at call time. The rule that makes a day save correct, insert the `Day` row first and then reconcile its entries, exists only as a chain of `.then()` calls inside a `useCallback` whose dependency array runs to twenty-two items (`DayView.tsx:266-289`). Three defects found during the review all live in exactly that untested space.

## The shape everything adopts

Plain async modules over the database, with thin hooks on top purely for subscription. `db/quickBirthControl.ts` is the existing precedent and the only React-free write path in the repo. Hooks hold no rules; they call the module. The interface is the test surface.

Two consequences worth stating because they are easy to get wrong under pressure:

- **Time is always a parameter.** No module reads the clock. `services/cyclePredictionLogic.ts:117` currently defaults `referenceDate` to `new Date()` and `hooks/useCyclePhase.ts:218` calls it inline inside a memo. Both become required parameters. A default that reads the clock is a hidden input.
- **Persistence timing is part of the interface.** The 100ms debounce, the in-flight guard and the two same-date guards are correctness rules, not implementation detail. They live inside the day module and are stated in what it promises. Pushing them out is how the duplicate implementation at `PregnancyDayView.tsx:70-106` came to exist.

## Module map

Names follow `CONTEXT.md` for the concept and existing precedent for the placement.

| Concept | Module | Precedent it follows |
| --- | --- | --- |
| Logged Day | `db/loggedDay.ts` | `db/quickBirthControl.ts`, the one React-free write path |
| Catalogue | `db/catalogue.ts` | same folder, same shape |
| Section enumeration | `constants/Sections.ts` | `constants/CyclePhases.ts` |
| Catalogue accordion | `components/dayView/CatalogueAccordion.tsx` | replaces three files in place |
| Cycle intelligence | `services/cyclePredictionLogic.ts`, kept | already tested, already correct |
| Gestational Age | `utils/pregnancyDates.ts`, grown | gives an existing shallow module depth |
| Week content | `data/pregnancyWeeks.ts` | `data/pregnancyBabySizes.ts` |
| State | `stores/`, moved from `assets/src/` | `assets/` otherwise holds images and fonts |

## Sequence

Phase 0 first, then the three tracks run independently of one another.

| Phase | Issue | Work | Depends on |
| --- | --- | --- | --- |
| 0 | [#178](https://github.com/adulbrich/ephira/issues/178) | Test seam, and make CI run tests at all | nothing |
| 1 | [#179](https://github.com/adulbrich/ephira/issues/179) | Defect: prediction write amplification | #178 |
| 1 | [#180](https://github.com/adulbrich/ephira/issues/180) | Defect: dead cases in the save-message switch | #178 |
| 1 | [#181](https://github.com/adulbrich/ephira/issues/181) | Defect: orphaning delete order, plus cleanup migration | #178 |
| A1 | [#182](https://github.com/adulbrich/ephira/issues/182) | Candidate 1: day module | #178 |
| A2 | [#183](https://github.com/adulbrich/ephira/issues/183) | Candidate 2: one selected-day record | #182 |
| A3 | [#184](https://github.com/adulbrich/ephira/issues/184) | Candidate 6: section identity and catalogue split | #183 |
| A4 | [#185](https://github.com/adulbrich/ephira/issues/185) | Candidate 5: collapse the catalogue accordions | #184 |
| B1 | [#186](https://github.com/adulbrich/ephira/issues/186) | Candidate 3: one definition of a cycle | #178 |
| B2 | [#187](https://github.com/adulbrich/ephira/issues/187) | Candidate 4: idempotent prediction persistence | #186, #179 |
| C1 | [#189](https://github.com/adulbrich/ephira/issues/189) | Candidate 8: move the 40-week content | nothing |
| C2 | [#188](https://github.com/adulbrich/ephira/issues/188) | Candidate 7: gestational age module | nothing |

Filed separately, deliberately after all of the above: [#190](https://github.com/adulbrich/ephira/issues/190), evaluating a migration from ESLint plus Prettier to Biome.

Track C is the cheapest and touches nothing the others touch, so it is the natural warm-up. Track A is the largest and is the reason the others became possible.

**Note on ordering.** The design interview settled that the defect fixes ship before the refactors. This plan puts the test seam ahead of both, so the defect fixes land with tests proving them. That is the only place the plan resolves an ordering the interview left implicit.

## Phase 0: test seam

`db/schema.ts` is plain `drizzle-orm/sqlite-core` with nothing Expo-specific. Only `db/operations/setup.ts:1-2` touches Expo, and all eleven `db/operations/*.ts` files reach the handle through that one specifier. So the seam already exists and needs **zero production edits**.

- Add `better-sqlite3` as a dev dependency. `drizzle-orm@0.45.1` already ships the `drizzle-orm/better-sqlite3` driver.
- Tests substitute the handle by mocking `@/db/operations/setup`, which hoists before any module-load capture runs. With it mocked, `expo-sqlite` never loads.
- Apply the existing `drizzle/` migrations to an in-memory database. All four are plain DDL, so they apply cleanly.
- **Foreign keys ON**, deliberately stricter than the device, which has no `PRAGMA foreign_keys` anywhere and therefore runs with them off. This is what surfaces defect 3 below.

Scope bound: this covers `db/operations/*` and the query paths of `db/database.ts`. It does not cover `useLiveQuery`, so `hooks/useLiveFilteredData.ts` and `hooks/usePregnancyMarkedDates.ts` stay outside it.

## Phase 1: defects

Each is a standalone commit, independently shippable, deliberately not folded into a refactor. Behaviour changes buried inside structural diffs are bad for review and worse for bisection.

**D1. Prediction write amplification.** `db/operations/predictionSnapshots.ts:10-24` inserts unconditionally with no dedupe. It is reached from an effect whose dependencies include `date` (`hooks/useMarkedDates.ts:365-368`, `:417`), and `app/(tabs)/calendar.tsx:151-153` changes `date` on every day tap. Tapping around the calendar with predictions displayed re-inserts the whole prediction set each time, and those rows are what the accuracy metric is computed from. Minimal fix: reconcile on `(prediction_made_date, predicted_date)` instead of inserting. The structural half is candidate 4.

**D2. Dead cases in the save-message switch.** `DayView.tsx:171-192` matches `"symptom"`, `"medication"` and `"note"`; the accordions send `"symptoms"` (`SymptomsAccordion.tsx:53`), `"medications"` (`MedicationsAccordion.tsx:61`) and `"notes"` (`NotesAccordion.tsx:24`). Three of seven cases never fire, so those saves fall to a fixed-priority `default` that can attribute "Saved!" to a section the user did not touch. Minimal fix: make the strings agree. The enumeration that prevents recurrence is candidate 6.

**D3. Orphaning delete order.** `setupEntryTypes` (`db/database.ts:174-178`) deletes all Symptoms, Moods and Medications without first clearing `symptom_entries`, `mood_entries` and `medication_entries`, which reference them. `deleteAllDataInDatabase` (`:154-158`) gets this right; this function does not. With foreign keys off on device the deletes succeed and orphan the children. The guard at `app/_layout.tsx:160-164` runs it whenever `databaseInitialSetup` is absent **or** not `"0000"`, and the function's own comment says "delete old formats if needed", so it is designed to run against a populated database on version bumps. For an upgrading user, historical Mood, Symptom and Medication logs stop joining and vanish from the app while remaining in the file. Fix: delete children first, matching `deleteAllDataInDatabase`.

### Two data migrations

Both are hand-edited SQL. `PROJECTSTRUCTURE.md:66` currently says not to edit `drizzle/` directly; amend it to name data migrations as the documented exception, rather than routing around the convention.

- **Dedupe `prediction_snapshots`, then add the unique index** on `(prediction_made_date, predicted_date)`. Order matters: every existing user has accumulated duplicates, so `CREATE UNIQUE INDEX` fails on their device unless the delete runs first. Keep the newest row per key. Without the index the invariant lives only in application code, which is the thing being moved away from.
- **Delete orphaned entry rows** left by D3. Not re-linked by name: the ids are gone, so matching would guess, and a wrong guess silently rewrites someone's health history. The data is already unreachable; this acknowledges the loss rather than hiding it.

## Track A: the logged day

### A1, candidate 1: the day module

`db/loggedDay.ts`, a plain async module owning both load and save for a Logged Day, with a thin hook over it.

The save path takes a whole-day snapshot and performs ensure-`Day`-then-reconcile-entries internally. That ordering rule is currently stated three times with two different answers: `db/quickBirthControl.ts:52-56` creates a missing `Day`, while `hooks/useSyncEntries.ts:19-20` and `hooks/useSyncMedicationEntries.ts:16-17` silently return. One answer, inside the module.

The snapshot carries Medication names plus per-entry detail, so "took the pill at 08:00" is expressible without a side store. That is what retires `useTimeTaken`.

The load path replaces at least seven queries for the same `Day` row on open (`DayView.tsx:297-306`, plus the three inline single-field loads at `:68-99`) with one, resolving entry names in the database rather than by looping `getById` calls in JavaScript.

**Deletes**: `hooks/useSyncEntries.ts`, `hooks/useSyncMedicationEntries.ts`, `hooks/useFetchEntries.ts`, `hooks/useFetchMedicationEntries.ts`, the twelve `useRef` mirrors at `DayView.tsx:124-163`, and the inline `fetchNotes` / `fetchCycleInfo` / `fetchIntercourse` callbacks.

### A2, candidate 2: one selected-day record

The selected **date** is genuinely shared: the calendar picks it and the day view reads it. The selected day's **contents** are not; they were global only so accordions and fetch hooks could talk past each other, which A1 absorbs.

- A small shared store keeps the selected date. Its only writer becomes the calendar's day press.
- `hooks/useMarkedDates.ts` becomes read-only with respect to selected-day state: no `setFlow` or `setId` at `:330`, and the redundant `setDate` calls at `:355` and `:413` that write back the value they just read go too. Those fan re-renders out to every reader for no state change.
- Both store files move from `assets/src/` to a top-level `stores/`. The imports are changing anyway, so the marginal cost is near zero.
- `constants/Interfaces.ts` loses the store-shape interfaces this kills, and splits into domain types and view types, so `Mood` stops meaning both a Catalogue entity and selection state.

**Deletes**: `useMoods`, `useSymptoms`, `useMedications`, `useBirthControl`, `useBirthControlNotes`, `useIntercourse`, `useTimeTaken`, `useTimePickerState`, `useTempSelectedTime`. Also the dead `useMarkedDates` store at `calendar-storage.tsx:67`, which has zero fields, zero readers, and collides by name with the 456-line hook.

Time-picker state becomes local to the accordion that owns it. Verified: `useTimePickerState` and `useTempSelectedTime` have exactly one reader each, `BirthControlAccordion`.

### A3, candidate 6: section identity and the catalogue split

`useAccordion` currently does two unrelated jobs: it tracks which Section is expanded, and it doubles as the cache-invalidation signal for the Catalogue fetch (`MoodsAccordion.tsx:29` keys its effect on `[state, customEntriesVisible]`). That is why `CustomEntries.tsx:340-347` and `EntryVisibilitySettings.tsx:239-246` both null a day-logging store to force a refresh, and why the same block is copied in two settings screens.

It also has a mode hazard: those settings screens always null the cycle `useAccordion`, but `PregnancyDayView.tsx:23` reads `usePregnancyAccordion` from `assets/src/pregnancy-storage.tsx`. The reach-back lands in a store the pregnancy view does not read.

Split into two:

- **Which Section is expanded** becomes ordinary local state, named by a `constants/Sections.ts` enumeration covering every Section in either mode, with each mode rendering its subset. Both the accordion and the save-message logic refer to it, so D2's class of bug stops compiling.
- **The Catalogue** becomes `db/catalogue.ts` with an explicit invalidation call. Settings screens call that instead of touching accordion state.

The enumeration also replaces the `"1"`–`"4"` accordion id numerals used by `initialExpandedAccordion`, whose mapping currently exists only in a comment at `MoodsAccordion.tsx:85` and is duplicated across `CustomEntries.tsx:369-402` and `EntryVisibilitySettings.tsx:266-308`.

### A4, candidate 5: collapse the catalogue accordions

`MoodsAccordion`, `SymptomsAccordion` and `MedicationsAccordion` are line-for-line identical apart from the Catalogue call, a label, an icon, a Section string and an id. `MedicationsAccordion` adds exactly one predicate, the birth-control exclusion at `:29` and `:37-41`. Even the run of six non-breaking spaces in the titles is copied.

One `components/dayView/CatalogueAccordion.tsx` takes which Catalogue it shows and which names are selected. It receives the list as data and never fetches, which makes it testable with no database at all.

The seam is real, not hypothetical: `DayView.tsx:466-485` and `PregnancyDayView.tsx:136-155` already drive these three through identical props with different storage behind them. Two adapters.

`FlowAccordion`, `BirthControlAccordion`, `IntercourseAccordion` and `NotesAccordion` stay separate. They have real behaviour: mutual exclusion of cycle start and end, a per-type render switch with a platform-split time picker, a switch rather than a grid, and a text field.

**Deletes**: two of the three accordion files, and the four-way `switch` over catalogue kind duplicated at `CustomEntries.tsx:287-304` and `EntryVisibilitySettings.tsx:181-224`.

## Track B: cycle intelligence

### B1, candidate 3: one definition of a cycle

Three modules currently answer "how many cycles have I logged?" differently:

- `services/cyclePredictionLogic.ts:41` honours the `is_cycle_start` and `is_cycle_end` markers. Tested.
- `hooks/useCyclePhase.ts:43-82` is a verbatim, module-private copy. Untestable for two independent reasons: the database import at `:13` and the inline `new Date()` at `:218`.
- `components/settings/CyclePrediction.tsx:84-114` is a **different algorithm**, pure gap detection that never consults the markers at all.

So marking a cycle start changes two of the three answers, and settings can gate predictions off a count the cycle tab never computes.

Grouping, average length, variation, the gating count and phase determination move beside `generatePredictions`, as parameterised functions taking logged days and a required reference date. `hooks/useCyclePhase.ts` shrinks to fetching prediction accuracy and calling them.

The module keeps the name `cyclePredictionLogic.ts` even though it will do more than prediction. Renaming is cosmetic and the cost would land on the one substantial test file we most want undisturbed while changing what it covers. Rename later, separately, if it still grates.

**Deletes**: the private copies at `useCyclePhase.ts:31-173`, and the third algorithm at `CyclePrediction.tsx:84-114`.

### B2, candidate 4: idempotent prediction persistence

The structural half of D1. Predict-and-persist becomes one plain async function that generates predictions **and** reconciles them against the snapshots already stored, so running it twice changes nothing. The three screens that need it (`app/(tabs)/calendar.tsx`, `index.tsx`, `cycle.tsx`, the last calling it from two separate effects) call that function directly, and only the resulting predicted dates flow into the store.

This is the review's clearest example of a pattern worth recognising: `generatePredictions` was deliberately extracted as pure and is well tested, yet the defect lived entirely in how its result was persisted at the call site, where no test reached.

**Deletes**: `hooks/useFetchCycleData.ts`. Its interface is a `useCallback` and a setter argument; the fetch-normalize-predict-save-notify-schedule chain it hides deserves a name that is not a hook.

## Track C: pregnancy

### C1, candidate 8: move the 40-week content

`app/(pregnancy-tabs)/info.tsx` is 853 lines, the largest module in the repo, of which roughly 484 are the static `pregnancyWeeks` record at `:41-524`. The file's size is why its own date helpers were retyped at `:27-33` instead of imported from `utils/pregnancyDates.ts:8` and `:13`.

Content moves to `data/pregnancyWeeks.ts`, reached through a clamping accessor beside `getBabySizeForWeek` in `constants/Pregnancy.ts`. Clamping rather than returning nothing, because a pregnancy can run past week 40 and a blank screen at that point is worst exactly when it is most likely to be read. This is the pattern `data/pregnancyBabySizes.ts` and `constants/CyclePhases.ts` already establish.

**Deletes**: the duplicated `parseISODate` and `differenceInDays` at `info.tsx:27-33`, and the divergent `getTrimester` at `:35-39`.

### C2, candidate 7: gestational age

The rule converting a stored start date plus offset into a week is retyped three times: `app/(pregnancy-tabs)/index.tsx:93-141`, `hooks/usePregnancySetup.ts:117-122`, and `info.tsx:705-716`, the last hardcoding `?? 14` instead of `DEFAULT_GESTATION_OFFSET_DAYS` from `constants/Pregnancy.ts:12`. Two trimester labels are live: `"First Trimester"` from `info.tsx:35-39` and `"1st Trimester"` from `constants/Pregnancy.ts:29-33`.

`utils/pregnancyDates.ts` grows into the gestational-age module: given a start date, an offset and a reference day it yields pregnancy day, week, day within week, trimester, due date and progress, plus the inverse mapping from each setup answer back to a start date and offset. That inverse is currently buried in a `useCallback` at `usePregnancySetup.ts:226-291` that also writes settings; extracted, its five branches become a table of cases exercisable without a date picker.

`"1st Trimester"` wins, on the grounds that `constants/Pregnancy.ts` already has the accessor pattern.

Today `utils/pregnancyDates.ts` is six one-line helpers, too shallow to be worth importing, which is exactly why `info.tsx` retyped two of them. This is what gives it depth.

## Tests

**CI does not currently run any tests.** The `test` script is `jest --watchAll`, which cannot run unattended, and neither workflow invokes jest. `.github/workflows/format-test.yml` runs only `npx eslint . --max-warnings=0` despite its name. There is also no typecheck gate: `tsc --noEmit` appears in no script and no workflow. So phase 0 needs a companion change or the tests it enables are never enforced: add a non-watch test script, invoke it in CI, and add a typecheck step. The workflow also pins Node 18, which is end-of-life.

Replace, do not layer. Old tests against shallow modules become waste once tests exist at the deepened interface.

`app/(tabs)/__tests__/index.test.tsx` mocks `@/assets/src/calendar-storage` wholesale plus three hooks, in order to assert phase-to-colour mapping. It breaks under A2 regardless, and mocking four modules to observe one pure mapping is the signature of testing past the interface. Delete it and re-express the intent with no mocks: colour mapping against `constants/CyclePhases.ts`, cycle state against the B1 module. Check its cases against `components/__tests__/FlowChart.gradient.test.ts` first and port only what is not already covered.

New tests go at the interfaces, against a real in-memory SQLite:

- `db/loggedDay.ts`: the ordering rule, the missing-`Day` rule, the reconcile rule, the debounce and its guards.
- `db/catalogue.ts`: invalidation, and visibility filtering.
- `services/cyclePredictionLogic.ts`: grouping with and without explicit markers, which is the disagreement B1 resolves.
- `utils/pregnancyDates.ts`: the five setup branches and the week boundaries, including past week 40.
- Prediction reconcile: running twice changes nothing.

## Conventions worth revisiting

This repository was built by senior CS students and the work is solid. A few decisions were reasonable at the time and are worth a second look now, separately from the defects above. None of these is a criticism; each is a case where the context changed.

**`drizzle/` is documented as never hand-edited** (`PROJECTSTRUCTURE.md:66`). Correct for schema migrations, which drizzle-kit generates. But the app now needs data migrations, and drizzle-kit does not generate those. All four existing migrations are pure DDL, so the convention has never been tested against this case. Amend it to carve out data migrations rather than working around it.

**The Zustand store lives under `assets/src/`.** `assets/` otherwise holds images and fonts. The store was presumably filed there once and `PROJECTSTRUCTURE.md` was updated to match, which is how "Images, fonts, videos, icons, etc. and Zustand store" came to be a sentence. A2 moves both store files to `stores/`.

**`constants/Interfaces.ts` mixes two kinds of type.** Domain data shapes such as `DayData` and `MarkedDate` sit beside store-shape interfaces such as `Mood` and `Symptoms`. That is how `Mood` came to mean a Catalogue entity in `db/schema.ts` and selection state in `constants/Interfaces.ts` simultaneously. It reads as one file because both are "interfaces"; they have nothing else in common. A2 splits it.

**`docs/` is both the Astro marketing site and the documentation root.** It has its own `package.json`, `node_modules` and a committed `dist/`, and now also holds `docs/agents/`, `docs/adr/` and `docs/plans/`. This works, since Astro builds only `docs/src/pages` and `docs/public`, and the markdown is tracked normally. But it surprises people, and someone will eventually assume `docs/` means the website and put documentation elsewhere. Either rename the site directory or say plainly at the top of `PROJECTSTRUCTURE.md` that `docs/` is both things.

**Linting is ESLint with Prettier wired in as a rule** (`prettier/prettier: "error"` in `eslint.config.js`), enforced in CI by `.github/workflows/format-test.yml`. That is a working setup. A migration to Biome is filed separately; note that because Prettier runs as an ESLint rule rather than beside it, adding a second formatter is not additive, it fails CI on every file it touches. Migration, not coexistence.
