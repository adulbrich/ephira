# Plan: deepening eight modules from the 2026-08-21 architecture review

> **For agentic workers:** use `superpowers:executing-plans` or `superpowers:subagent-driven-development`. Steps use checkbox (`- [ ]`) syntax.

**Date**: 2026-08-21 · **Base commit**: 640b711 · **Branch**: `refactor/architecture-review-2026-08-21` · **Status**: executed, all four tracks landed

**Goal:** Give eight modules a seam their rules can be tested through, and fix the four user-visible defects that fell out of the review.

**Architecture:** Every track follows the shape `services/cyclePredictionLogic.ts` + `services/cyclePredictions.ts` already demonstrate: a pure module that takes values and returns values, with a thin database-bound or React-bound shell in front of it. No track merges cycle and pregnancy modes; see `docs/adr/0001-keep-cycle-and-pregnancy-modes-separate.md`.

**Tech stack:** Expo SDK 57, React Native, Drizzle over expo-sqlite, Zustand, Jest with `better-sqlite3` in memory.

**Spec:** the architecture review report of 2026-08-21 (candidates 01–08), summarised per track below.

## Global constraints

- Vocabulary per `CONTEXT.md` for the domain and `docs/agents/domain.md` for the architecture. Never "component", "service", "wrapper", "layer", "boundary" in prose or comments.
- **Time is always a parameter.** No new module reads the clock. Follow `services/cyclePredictionLogic.ts:139-140`.
- Tests live in `__tests__/` beside the code, named `*.test.ts`. Database tests use `jest.mock("@/db/operations/setup", () => jest.requireActual("@/__tests__/helpers/testDatabase"))` and `resetTestDatabase()` in `beforeEach`.
- `npm run typecheck`, `npm run lint` and `npm test` must pass before each commit.
- One commit per track. Commit message style follows the existing history: `refactor:` / `fix:` plus a sentence that says what changed, not what file changed.
- **The test is the deliverable.** Each track names the test that was impossible before. A track that lands without its test has delivered nothing.

## Decisions taken before execution

| Question | Decision |
| --- | --- |
| Candidate 01 and the `selected` field | Take the deletion half of candidate 09 into Track A, **cycle mode only**. `MarkedDate.selected` becomes optional, the builder stops writing it, and the dead effect at `useMarkedDates.ts:430-454` is deleted. Pregnancy mode is untouched, so ADR 0001 needs no reopening. |
| Candidate 05 and the 10-second accuracy poll | **Out of scope.** Every track in this pass moves or deletes existing code. The `setInterval` at `CyclePrediction.tsx:53-69` stays. |
| Git | One branch, four commits. |

## Track order and why

```
Track A   06 → 01 → 09-deletion     one pass over useMarkedDates.ts
Track B   02 → 05                   05 reconciles filters via 02's seam
Track C   03 + 07                   both rewrite FlowChart.tsx
Track D   04, then 08               independent of everything
```

06 lands inside Track A rather than before it, because both edit the same file and 06's interface shrink is what gives the extracted module a clean input contract.

---

## Track A — the cycle Marked Dates rules

**Candidates:** 06 (shrink `useLiveFilteredData`), 01 (extract the rules), 09-deletion (drop `selected`).

**Files:**
- Create: `services/cycleMarkedDates.ts`
- Create: `services/__tests__/cycleMarkedDates.test.ts`
- Modify: `hooks/useLiveFilteredData.ts` — drop the `filters` parameter and the `loading` return
- Modify: `hooks/useMarkedDates.ts:133-327` (delete builder), `:329-457` (rewrite hook), delete `:430-454`
- Modify: `constants/Interfaces.ts:31-36` — `selected?: boolean`
- Modify: `app/(tabs)/calendar.tsx:113` — `displayLoadingIndicator`

**Interfaces:**

- Produces:
  ```ts
  // services/cycleMarkedDates.ts
  export function cycleMarkedDates(input: {
    days: DayData[];
    filters: string[];
    catalogue: Catalogue;
    predictions: PredictedDate[];
  }): MarkedDates;
  ```
  Pure and synchronous. `predictions` is `[]` when the Cycle Prediction filter is off or the choice is false — the caller decides, the module just does not overlay. Prediction marks are written first and logged-day marks overlay them, preserving the current `{ ...predicted, ...logged }` precedence at `useMarkedDates.ts:413`.

- Consumes: `Catalogue` from `db/catalogue.ts:66-71`, already exactly the four lists the builder fetches by hand at `:137-154`. `useCatalogue()` (`hooks/useCatalogue.ts:19`) supplies it in the shell.

- ```ts
  // hooks/useLiveFilteredData.ts
  export const useLoggedDaysLive: () => DayData[];
  ```

### Steps

- [x] **A1. Write the failing tests for `cycleMarkedDates`.** In `services/__tests__/cycleMarkedDates.test.ts`. No database, no mocks — it is a pure function. Cover, at minimum:
  - Confidence boundaries, the rules that are unreachable today. A prediction at 49 → `rgba(...,0.4)`, at 50 → `rgba(...,0.7)`, at 79 → `rgba(...,0.7)`, at 80 → `rgba(...,1)`. Colour base is `CyclePredictionColor`.
  - Run capping: three consecutive flow days with `filters: ["Flow"]` give `startingDay: true` on the first, neither cap on the middle, `endingDay: true` on the last. A one-day gap splits it into two capped runs.
  - The transparent-spacer invariant: with `filters: ["Flow", "Notes"]`, a day with flow and no notes still pushes two entries, so the Flow bar keeps its index.
  - Logged-day marks overlay prediction marks on the same date.
  - `filters: []` yields an entry per day with `periods: []`.
  - No returned entry has a `selected` key.
- [x] **A2. Run them and watch them fail.** `npx jest services/__tests__/cycleMarkedDates.test.ts` — expected: cannot resolve `services/cycleMarkedDates`.
- [x] **A3. Create `services/cycleMarkedDates.ts`.** Move `getStartingAndEndingDay` (`useMarkedDates.ts:27-45`), `applyOpacityToColor` (`:53-76`), `applyFilterToMarkedDates` (`:78-131`) and the body of `markedDatesBuilder` (`:156-326`) verbatim, with three changes: the four `await get…` calls at `:137-154` become reads off the `catalogue` parameter; every `{ selected: false, periods: [] }` becomes `{ periods: [] }`; and the prediction overlay from `:376-412` moves in ahead of the day loop, guarded by `predictions.length > 0`. Give the module a doc comment naming CONTEXT.md's **Marked Dates** entry as the definition it implements.
- [x] **A4. Run the tests until they pass.** Fix the module, not the tests.
- [x] **A5. Make `selected` optional.** `constants/Interfaces.ts:32` → `selected?: boolean`. Run `npm run typecheck`. `usePregnancyMarkedDates.ts` still writes `selected: false` and stays assignable, so pregnancy mode does not change.
- [x] **A6. Shrink `useLiveFilteredData`.** Rename to `useLoggedDaysLive`, drop the `filters` parameter, delete the `loading` state and the `useEffect` at `:68-76`, and return `daysFromJoinedRows(data)` memoised on `data`. Update the import at `hooks/useMarkedDates.ts:19`.
- [x] **A7. Rewrite the hook.** `useMarkedDates` keeps the store reads, `useCatalogue()`, and one effect that fetches predictions when `calendarFilters?.includes("Cycle Prediction") && predictionChoice === true`, then calls `cycleMarkedDates`. Delete the selected-tracking effect at `:430-454` and the now-unused `today` at `:347`. **Drop `date` from the dependency array** — nothing in the effect reads it, and its presence fires a `prediction_snapshots` write and a notification reschedule on every day tap.
- [x] **A8. Fix the loading indicator.** `useMarkedDates` no longer returns `loading`. At `app/(tabs)/calendar.tsx:113`, remove `displayLoadingIndicator` rather than replacing it — the flag it read has never been `true`.
- [x] **A9. Verify.** `npm test`, `npm run typecheck`, `npm run lint`. All three green.
- [x] **A10. Commit.** `refactor: give the cycle Marked Dates rules a seam a test can reach`

---

## Track B — the selected filters, then Prediction availability

**Candidates:** 02 (one owner for the selected filters), 05 (Prediction availability and choice).

**Files:**
- Create: `db/selectedFilters.ts`, `db/__tests__/selectedFilters.test.ts`
- Create: `services/predictionAvailability.ts`, `db/__tests__/predictionAvailability.test.ts`
- Modify: `components/settings/CustomEntries.tsx:299-316`, `components/settings/EntryVisibilitySettings.tsx:174-196`, `components/settings/CyclePrediction.tsx:40-178`, `components/calendar/CalendarFilterDialog.tsx:32, :165-215, :225-243`
- Modify: `app/(tabs)/calendar.tsx:171, :196`, `hooks/useMarkedDates.ts` — use the exported filter name

**Interfaces:**

- Produces:
  ```ts
  // db/selectedFilters.ts
  export const PREDICTION_FILTER = "Cycle Prediction";
  export function orderFilters(filters: string[]): string[];        // Flow first
  export function applyFilterChange(
    current: string[],
    change: { remove: string } | { add: string } | { replace: string[] },
  ): string[];                                                       // pure
  export async function commitFilters(next: string[]): Promise<string[]>;
  ```
  `commitFilters` orders, then writes `SettingsKeys.calendarFilters` — one operation, so store and disk cannot disagree. Callers pass the result to `setSelectedFilters`. `loadCalendarFilters` (`db/preferences.ts:60-67`) is unchanged and is this module's read side.

  ```ts
  // services/predictionAvailability.ts
  export async function readPredictionAvailability(
    days: DayData[],
  ): Promise<{ cycleCount: number; hasEnough: boolean; message: string }>;
  export async function setPredictionChoice(
    choice: boolean,
    referenceDay: Date,
    current: string[],
  ): Promise<{ filters: string[]; predictions: PredictedDate[] }>;
  ```
  `setPredictionChoice` is the one path for a change of choice, whether the user made it or the data forced it: it writes `SettingsKeys.cyclePredictions`, refreshes or clears the predicted Cycle, and reconciles the filter list through `commitFilters`.

### Steps

- [x] **B1. Write the failing test for the durable filter list.** `db/__tests__/selectedFilters.test.ts`, using the database harness. Assert: deleting a Catalogue item that is an active filter leaves it out of what `loadCalendarFilters()` returns after a round trip; Flow stays first however the change arrived; adding then removing the Prediction filter is a no-op on disk.
- [x] **B2. Run it; watch it fail.** Expected: cannot resolve `@/db/selectedFilters`.
- [x] **B3. Write `db/selectedFilters.ts`.** Move the Flow-first sort from `CalendarFilterDialog.tsx:228-237` verbatim — it is the only correct copy. Export `PREDICTION_FILTER` and delete the local `PredictionOption` at `:32`.
- [x] **B4. Run until green.**
- [x] **B5. Move the three broken writers onto the seam.** `CustomEntries.tsx:306-315` and `EntryVisibilitySettings.tsx:186-195` call `commitFilters(applyFilterChange(selectedFilters, { remove: name }))` and hand the result to `setSelectedFilters` — this is where the stale-array defect dies. `CalendarFilterDialog.tsx:226-243` calls `commitFilters(applyFilterChange(current, { replace: next }))`.
- [x] **B6. Replace the seven bare literals.** `"Cycle Prediction"` at `CyclePrediction.tsx:115,117,162,169`, `app/(tabs)/calendar.tsx:171,196` and `hooks/useMarkedDates.ts` becomes `PREDICTION_FILTER`. Leave the user-facing strings at `CyclePrediction.tsx:186-189` and `useNotifications.ts:85` alone — those are copy, not the filter name.
- [x] **B7. Verify and commit the first half.** `npm test && npm run typecheck && npm run lint`, then `fix: write the filter list the user just changed, not the one before it`.
- [x] **B8. Write the failing test for Prediction availability.** `db/__tests__/predictionAvailability.test.ts`. The headline assertion: logging enough Cycles makes predictions available, and then deleting flow days turns the stored preference back off **and** drops the Prediction filter from what survives a restart. Modelled on `db/__tests__/refreshPredictions.test.ts`.
- [x] **B9. Run it; watch it fail.**
- [x] **B10. Write `services/predictionAvailability.ts`.** Move the availability derivation from `CyclePrediction.tsx:71-104`, including the pluralisation at `:99-101` and the "no flow data logged yet" case. Move the auto-disable rule from `:106-121` and the toggle path from `:156-178` into the single `setPredictionChoice`. Count Cycles through `countCompleteCycles` / `hasEnoughCyclesForPrediction` only.
- [x] **B11. Run until green.**
- [x] **B12. Reduce `CyclePrediction.tsx` to rendering.** It reads availability and calls the verb. Its three effects at `:71-139` and `:142-154` collapse to one. The `setInterval` at `:53-69` stays, per the scope decision.
- [x] **B13. Delete the fourth Cycle definition.** Replace `CalendarFilterDialog.tsx:182-215` with `hasEnoughCyclesForPrediction`. This restores CONTEXT.md's "exactly one definition" to being true and removes ~34 lines.
- [x] **B14. Subscribe to the Catalogue.** `CalendarFilterDialog.tsx:136-164` — four `useState`s and an effect become `useCatalogue()`.
- [x] **B15. Verify and commit.** `refactor: give Prediction availability and the choice to use it one owner`

---

## Track C — the flow Days, and the flow ring

**Candidates:** 03 (an owner for the flow Days), 07 (the ring's rules and the timezone defect).

**Files:**
- Create: `services/flowRing.ts`, `services/__tests__/flowRing.test.ts`
- Create: `db/flowDays.ts`, `db/__tests__/flowDays.test.ts`
- Delete: `hooks/useFetchFlowData.ts`; delete `useFlowData` from `stores/calendar-storage.tsx:52-62`
- Modify: `components/FlowChart.tsx:37-62, :104-147, :150-167, :171-234`, `app/(tabs)/index.tsx:32,:39-51`, `app/(tabs)/cycle.tsx:115,:120-133`
- Modify: `services/cyclePredictions.ts:28-36` — read the normalisation from `db/flowDays.ts`
- Delete: `components/__tests__/FlowChart.gradient.test.ts` once `flowRing.test.ts` covers the same nineteen cases against the real code

**Interfaces:**

- Produces:
  ```ts
  // db/flowDays.ts
  export function normaliseFlowDays(days: DayData[]): DayData[];      // pure
  export async function loadFlowDays(): Promise<DayData[]>;           // newest last
  // services/flowRing.ts
  export function flowRing(days: DayData[], referenceDay: Date): {
    monthDays: DayData[];
    progress: number;        // min(flowDays / MAX_FLOW_LENGTH, 1)
    markerAngle: number;
    gradientStops: { offset: string; color: string }[];
  };
  ```
  `referenceDay` is required. `flowRing` uses `formatAsISODate` (`utils/dates.ts:8-13`) for every date string.

### Steps

- [x] **C1. Write the failing test for the month window.** `services/__tests__/flowRing.test.ts`. The assertion that is impossible today: a Day dated the last calendar day of the month is inside the window, and a Day dated the last day of the *previous* month is outside it, with the process running under `TZ=Europe/Berlin`. Set `process.env.TZ` at the top of the file before importing.
- [x] **C2. Port the nineteen gradient cases.** Move them from `components/__tests__/FlowChart.gradient.test.ts` so they run against `flowRing` rather than the hand-copy the file admits to at `:5-7`. Delete the old file in the same step.
- [x] **C3. Run; watch them fail.**
- [x] **C4. Write `services/flowRing.ts`.** Move `FlowChart.tsx:53-62` (month bounds and angle), `:124-147` (the filter), `:150-167` (progress and dash geometry) and `:171-234` (gradient stops). Replace both `toISOString().split("T")[0]` calls at `:128-129` with `formatAsISODate`. Take `referenceDay` as a parameter instead of `new Date()` at `:53`.
- [x] **C5. Run until green.** The Berlin test is the one that proves the fix.
- [x] **C6. Write `db/flowDays.ts` and its test.** Move the normalisation from `hooks/useFetchFlowData.ts:12-24`, which is the same code as `services/cyclePredictions.ts:28-36`. Test that a Day with null `flow_intensity` is dropped and null `notes` resolves to `undefined`.
- [x] **C7. Give the Days an owner.** Load them keyed on `databaseChange`, which `app/(tabs)/index.tsx` and `app/(tabs)/cycle.tsx` already watch. Delete `hooks/useFetchFlowData.ts` and the `useFocusEffect` at `FlowChart.tsx:104-122`. The cycle tab now reloads Days on a database change, which it never did.
- [x] **C8. Delete the `useFlowData` store.** `stores/calendar-storage.tsx:52-62`. One writer and one reader, both `FlowChart.tsx`. Derive the month's Days from `flowRing` at the point of use.
- [x] **C9. Point `cyclePredictions.ts` at the shared normalisation.** `:28-36` calls `normaliseFlowDays`.
- [x] **C10. Verify and commit.** `refactor: give the flow Days an owner, and date the flow ring by the local day`

---

## Track D — the pregnancy anchor, and the authentication choice

**Candidates:** 04, 08. Independent of Tracks A–C and of each other.

**Files:**
- Modify: `utils/pregnancyDates.ts` (grow), `utils/__tests__/pregnancyDates.test.ts`
- Modify: `hooks/usePregnancySetup.ts:64-124, :201-292, :294-322`, `components/pregnancy/PregnancySetupDialog.tsx:24-52`, `app/(pregnancy-tabs)/index.tsx:20, :58-90`, `app/(pregnancy-tabs)/info.tsx:190-210`
- Create: `db/authenticationChoice.ts`, `db/__tests__/authenticationChoice.test.ts`
- Modify: `components/settings/AuthenticationSettings.tsx:229-291`

**Interfaces:**

- Produces:
  ```ts
  // utils/pregnancyDates.ts — grown, not restructured
  export async function loadPregnancyAnchor(): Promise<{ startDate: string | null; offsetDays: number }>;
  export async function savePregnancyAnchor(anchor: { startDate: string; offsetDays: number }): Promise<void>;
  export function setupDefaultsFromAnchor(
    anchor: { startDate: string; offsetDays: number },
    referenceDay: Date,
  ): { dueDate: string; lastPeriod: string; conceptionDate: string; weekNumber: number; dayOfWeek: number };
  // db/authenticationChoice.ts
  export async function loadAuthenticationChoice(): Promise<AuthType>;
  export async function chooseNoAuthentication(): Promise<void>;
  export async function chooseBiometric(): Promise<void>;
  export async function choosePassword(plaintext: string): Promise<void>;
  ```
  `loadPregnancyAnchor` applies the finiteness and range check from `usePregnancySetup.ts:101-110` — the only copy that validates — so `info.tsx` inherits it. `setupDefaultsFromAnchor` reads pregnancy day zero and the due date off `gestationalAge` rather than re-deriving them as `usePregnancySetup.ts:64-91` does. `choosePassword` derives the hash **before** it writes either setting.

### Steps

- [x] **D1. Write the failing tests for the anchor.** In `utils/__tests__/pregnancyDates.test.ts`. Assert: a stored offset of `""`, `"abc"` and `"999"` each yields `DEFAULT_GESTATION_OFFSET_DAYS`; and a pregnancy at week 43 round-trips through `loadPregnancyAnchor` → `setupDefaultsFromAnchor` → `savePregnancyAnchor` without changing the stored anchor.
- [x] **D2. Run; watch them fail.**
- [x] **D3. Grow `utils/pregnancyDates.ts`.** Add the three functions. Move the validation from `usePregnancySetup.ts:101-110` and the default derivation from `:64-91`, taking day zero and due date from `gestationalAge` instead of recomputing.
- [x] **D4. Run until green.**
- [x] **D5. Move the three readers onto it.** `app/(pregnancy-tabs)/info.tsx:201-205` (which does not validate today) and `app/(pregnancy-tabs)/index.tsx:20` (which hardcodes `14`) both call `loadPregnancyAnchor`. Remove the double read at `index.tsx:60` and the ignored `_hasStartDate` parameter.
- [x] **D6. Settle the week rule.** Hydration, the stepper and save must agree. Clamp at the point of hydration so what is displayed is what is validated — this is what fixes the week-43 save failure. Delete the unreachable `positiveTestDateInput` state (`usePregnancySetup.ts:50-52, :174, :300`, `PregnancySetupDialog.tsx:40, :92`); nothing ever opens that picker and `SetupAnswer` has no arm for it.
- [x] **D7. Write the failing test for the authentication choice.** `db/__tests__/authenticationChoice.test.ts`: a failure while deriving the credential leaves the previous mode intact; choosing none or biometric leaves no stored password behind.
- [x] **D8. Run; watch it fail.**
- [x] **D9. Write `db/authenticationChoice.ts`.** Shaped like `db/preferences.ts:32-50`: a loader with the default on record, and one operation per transition. `choosePassword` derives the hash first, then writes mode and credential in a fixed order, so a rejection from `Crypto.digestStringAsync` cannot leave "password mode, no password".
- [x] **D10. Reduce `AuthenticationSettings.tsx` to its dialogs.** `:230-244`'s four-branch parse becomes `loadAuthenticationChoice()`; the three handlers at `:246-291` each call one verb.
- [x] **D11. Verify and commit.** `refactor: give the pregnancy anchor and the authentication choice an owner each`

---

## After the tracks

- [x] Add the new module names to `CONTEXT.md` as each lands, not upfront: **Selected Filters**, **Prediction Availability**, **Flow Ring**, **Pregnancy Anchor**, **Authentication Choice**.
- [x] Correct `PROJECTSTRUCTURE.md`'s `/hooks/` section, which still documents five hooks `db/loggedDay.ts` absorbed, and now also `useFetchFlowData` and `useLiveFilteredData`.
- [ ] Still open: candidate 09's pregnancy half (`usePregnancyMarkedDates.ts:112-123`) and candidate 10 (the export row model) are **not** in this pass.
- [ ] Still open: `export` the pure builder at `hooks/usePregnancyMarkedDates.ts:11`, per ADR 0001's own Consequences section. One keyword; do it whenever pregnancy mode is next touched.

## What the tracks turned up that the review had not

Both were found by writing the test, not by reading the code.

- **A Day created by the quick birth control path gets a Notes marker it never
  earned.** `insertDay` writes `notes ?? null`, `quickBirthControl.ts:50` passes
  no notes, and the Notes rule tests `day.notes === ""`. Behaviour was moved
  verbatim and is pinned by a test named as a known defect in
  `services/__tests__/cycleMarkedDates.test.ts`, so fixing it is deliberate.
- **A pregnancy past 41 weeks could not be stored.** Fixed in Track D;
  `MAX_GESTATION_OFFSET_DAYS` now derives from `MAX_PREGNANCY_WEEK_INPUT`.
