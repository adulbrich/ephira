# Cycle Prediction – Fallback Logic and Model Behavior

This document describes how the cycle prediction model behaves when data is missing, irregular, or insufficient, and how the UI should respond.

## Design Principles

- **Privacy-preserving:** Predictions are based only on local flow data; no server-side cycle data.
- **Stable:** The system never returns `null` or undefined for the prediction list; it returns an array (possibly empty).
- **Explicit confidence:** Every prediction has a confidence value 0–100; when there are no predictions, the app treats confidence as 0 so the UI can show “Low confidence”.

---

## Fallback Rules

### 1. No flow data (first-time or no logs)

- **Condition:** No days with `flow_intensity` (or empty list).
- **Behavior:** `generatePredictions()` returns `[]`.
- **UI:** Show welcome / “Start logging” state. Do not show a prediction card with a date; if a card is shown, show “Unknown” for date and “Low confidence” (confidence 0).

### 2. Insufficient cycles (fewer than 3 consecutive flow days in any block)

- **Condition:** No group of ≥3 consecutive flow days (or manual markers do not form such a block).
- **Behavior:** No valid cycle → return `[]`.
- **UI:** Same as “no flow data” – encourage logging; no prediction date.

### 3. Only one valid cycle

- **Condition:** Exactly one valid cycle (one block of ≥3 consecutive flow days).
- **Behavior:** Average cycle length falls back to **default 28 days**. Predictions are still generated for future cycles. **Confidence is set to 30** (minimal data).
- **UI:** If predictions are shown, display **“Low confidence”** and consider messaging like “Log one more full cycle to improve predictions.”

### 4. Two or more cycles but high variability

- **Condition:** Cycle lengths (between consecutive cycle starts) vary a lot (e.g. standard deviation &gt;7 days).
- **Behavior:** Regularity score is reduced (25–50%); confidence drops but predictions are still returned.
- **UI:** Show **“Low” or “Medium” confidence**; avoid implying high certainty.

### 5. Cycle lengths outside 21–35 days

- **Condition:** Interval between two cycle starts is &lt;21 or &gt;35 days.
- **Behavior:** That interval is **excluded** from the average. If all intervals are excluded, average length falls back to **28 days**.
- **UI:** Predictions still shown; confidence may be lower depending on how many intervals were valid.

### 6. Stale data (last cycle long ago)

- **Condition:** Last cycle end is &gt;60–120+ days before “today”.
- **Behavior:** Recency score is reduced (25–50%); confidence decreases.
- **UI:** Prefer “Low” or “Medium” confidence; optional hint to log recent flow.

### 7. No predictions in the future

- **Condition:** After computing next cycle starts, all fall before or on the reference date (e.g. reference date in future, or edge case).
- **Behavior:** Return **empty array** `[]`.
- **UI:** Treat as “no predictions”: `nextPredictedStart === null`, `confidence === 0`. Show “Unknown” and “Low confidence”; do not show a specific date.

### 8. Wait for one full cycle (recommended UX)

- **Recommendation:** Until the user has at least **2 complete cycles** (each ≥3 consecutive flow days), the app can:
  - Show predictions with **low confidence** and clearly label them, or
  - Show “Log one more full cycle to unlock predictions” and hide date estimate.
- **Current implementation:** `hasEnoughData` is true when `validCycles.length >= MIN_CYCLES_FOR_PREDICTION` (2). When false, the Cycle tab shows “Building Your Cycle Profile” and does not show the prediction card with a date.

---

## Confidence Bands (UI)

- **High:** 80–100 → “High confidence”
- **Medium:** 50–79 → “Medium confidence”
- **Low:** 1–49 → “Low confidence”
- **None:** 0 (no predictions) → “Low confidence” and “Unknown” date

---

## Model Output Guarantees

- **Return type:** `PredictedDate[]` – always an array, never `null`/undefined.
- **Elements:** Each has `date: string` (YYYY-MM-DD) and `confidence: number` (0–100).
- **Order:** By date (future first when taking “next” in UI).
- **Empty array:** Valid response; UI must handle it without assuming a non-empty list.

---

## UI Handling Checklist

- [ ] Never assume `predictedCycle.length > 0` without checking.
- [ ] Use `nextPredictedStart ?? "Unknown"` (or equivalent) when displaying date.
- [ ] Use `confidence` to show High/Medium/Low; treat 0 as Low.
- [ ] When `!hasEnoughData`, show insufficient-data card instead of prediction card with a single date.
- [ ] Notifications: only schedule for predictions above the user’s minimum confidence threshold (see NotificationSettings).
