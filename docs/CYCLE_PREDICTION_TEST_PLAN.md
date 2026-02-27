# Cycle Prediction – Test Plan (Edge Cases)

This document describes edge-case inputs the prediction system must handle, and how tests simulate them.

## Goals

- Predictions never break or produce empty/null outputs where the UI expects values.
- The model returns consistent predictions with explicit confidence values.
- The app UI correctly handles low-confidence and no-prediction states.

---

## Edge-Case Scenarios (10+)

### 1. First-time user – no flow data

- **Input:** `flowData = []` or no days with `flow_intensity`.
- **Expected:** `generatePredictions()` returns `[]`. UI shows welcome/insufficient-data state; no prediction card with invalid data.
- **Test:** Call `generatePredictions([])` → `[]`.

### 2. Single flow day

- **Input:** One day with flow (e.g. one entry).
- **Expected:** No valid cycle (need ≥3 consecutive days). Returns `[]`.
- **Test:** One flow day → `[]`.

### 3. Two consecutive flow days

- **Input:** Two consecutive days with flow.
- **Expected:** No valid cycle. Returns `[]`.
- **Test:** Two consecutive flow days → `[]`.

### 4. Exactly three consecutive flow days (one minimal “cycle”)

- **Input:** One block of exactly 3 consecutive flow days.
- **Expected:** One valid cycle, but only one cycle → average length falls back to default (28). Predictions may be generated for that single cycle; confidence should be low (e.g. 30) when `cycleLengths.length < 2`.
- **Test:** One block of 3 consecutive days → non-empty predictions, low confidence.

### 5. Two valid cycles – minimal data for “reliable” prediction

- **Input:** Two cycles, each with ≥3 consecutive flow days, with gap between cycles (e.g. 28 days).
- **Expected:** Non-empty predictions; confidence still moderate (e.g. 50 for amount of data).
- **Test:** Two cycles, 28 days apart → predictions, confidence in expected range.

### 6. High cycle-length variability (irregular cycles)

- **Input:** Several cycles with lengths varying a lot (e.g. 22, 35, 24, 33).
- **Expected:** Predictions still returned; confidence reduced (regularity score 25–50).
- **Test:** High variance in cycle lengths → lower confidence, no throw, non-null output.

### 7. Gaps in logging (skipped days)

- **Input:** Flow on days 1–5, then gap, then flow on 10–14. Treated as two cycles.
- **Expected:** Two cycles; predictions based on average length between cycle starts. No crash; confidence may be lower if gaps create odd “cycle” lengths.
- **Test:** Two segments with gap → two cycles, predictions present.

### 8. Manual cycle start/end markers

- **Input:** Consecutive flow days split by `is_cycle_start` / `is_cycle_end` so that one block is split into two “cycles”.
- **Expected:** Grouping respects markers; predictions use the marked cycles.
- **Test:** Same dates with different markers → different grouping and predictions.

### 9. Cycle lengths outside valid range (21–35 days)

- **Input:** Two cycles with 40 days between starts (or &lt;21).
- **Expected:** That interval excluded from average; fallback to default 28-day length. Predictions still generated; no empty/null.
- **Test:** All intervals out of range → default length 28, predictions non-empty.

### 10. Stale data (last cycle &gt;120 days ago)

- **Input:** Last flow cycle ended more than 120 days before reference date.
- **Expected:** Recency score 25; confidence reduced; predictions still returned (no empty).
- **Test:** Old last cycle → lower confidence, predictions still present.

### 11. All future predictions fall before reference date

- **Input:** Last cycle start so far in the past that adding average length × N still lands before reference date (e.g. reference date in future, or very long cycle length).
- **Expected:** List of predictions can be empty (all filtered out as non-future). UI must handle empty list and `nextPredictedStart === null`, `confidence === 0`.
- **Test:** referenceDate ahead of all predicted windows → `[]` or only future dates.

### 12. Empty flow intensity (zero or undefined)

- **Input:** Days with `flow_intensity: 0` or undefined.
- **Expected:** Filtered out; only positive flow counts. No crash.
- **Test:** Mix of 0 and positive flow → only positive flow used; behavior as in scenarios 1–4 depending on count.

### 13. Unsorted flow data

- **Input:** Flow days in random date order.
- **Expected:** Internal sort by date; grouping and predictions unchanged.
- **Test:** Shuffle flow array → same result as sorted.

### 14. Single very long “cycle” (e.g. 10 consecutive flow days)

- **Input:** One block of 10 consecutive flow days (one cycle).
- **Expected:** One valid cycle; average length default 28; predictions for that cycle duration (10 days) in future; low confidence.
- **Test:** One long block → predictions with 10-day duration, low confidence.

### 15. Multiple calls / repeated fetch

- **Input:** Calling `fetchCycleData` (or equivalent) multiple times in sequence.
- **Expected:** Each call returns a fresh list; no accumulation of previous results (no shared mutable array).
- **Test:** Two calls with same data → same length and content each time (no doubling).

### 16. Timezone / reference date at midnight

- **Input:** referenceDate at local midnight (or UTC) so that “today” boundary is clear.
- **Expected:** Only dates strictly after reference date included; no off-by-one.
- **Test:** referenceDate at midnight → no same-day predictions if policy is “future only”.

---

## Test Implementation

- **Unit tests:** `__tests__/cyclePredictionLogic.test.ts` – pure logic with fixed `referenceDate` and controlled `DayData[]`.
- **Coverage:** All scenarios above are covered by named test cases.
- **Integration:** `useFetchCycleData` is covered indirectly via the same logic; DB/notifications are mocked where needed.

## Success Criteria

- Prediction results never throw; empty input → empty array, not null/undefined.
- All edge-case tests pass.
- Confidence is always 0–100 when present; 0 when there are no predictions.
- UI shows “Low confidence” and “Unknown” date when appropriate (see CYCLE_PREDICTION_FALLBACK_LOGIC.md).
