# ADR 0001: Keep cycle and pregnancy tracking modes separate

- **Status**: Accepted
- **Date**: 2026-08-18
- **Context commit**: 249566d

## Context

The two tracking modes are laid out symmetrically in the file tree:

| Cycle | Pregnancy |
| --- | --- |
| `app/(tabs)/` | `app/(pregnancy-tabs)/` |
| `components/dayView/` | `components/pregnancyDayView/` |
| `hooks/useMarkedDates.ts` | `hooks/usePregnancyMarkedDates.ts` |
| `db/operations/days.ts` | `db/operations/pregnancyDays.ts` |
| `assets/src/calendar-storage.tsx` | `assets/src/pregnancy-storage.tsx` |

The symmetry reads as duplication and invites a merge: one day module parameterised by mode, or a shared core with an adapter per mode. An architecture review on 2026-08-18 evaluated exactly that and rejected it. Without this record, the next review will re-propose it, because the case against is invisible from the file names.

## Decision

The two modes stay separate. They share only what has one rule for both: the leaf accordions in `components/dayView/` that `PregnancyDayView` already imports, the Section enumeration, and the `MarkedDates` value type.

## Rationale

Three discriminators, each independently sufficient.

**The storage models differ, and not superficially.** `days` normalizes Moods and Symptoms into `mood_entries` and `symptom_entries`, with six field-granular updaters in `db/operations/days.ts:63-95`. `pregnancy_days` stores the same concepts as JSON text columns written by a single whole-row upsert at `db/operations/pregnancyDays.ts:25-26`. A merged module would have to carry both, selected by mode.

**The marking semantics differ.** Cycle marks encode runs: start and end caps, adjacency to neighbouring days, and confidence-scaled opacity for prediction overlays (`hooks/useMarkedDates.ts:27-44`, `:77-127`). Pregnancy marks are point events, every one of them `startingDay: true, endingDay: true` (`hooks/usePregnancyMarkedDates.ts:34-38`). These are different algorithms producing the same value type, not two adapters over one interface.

**One mode has a side effect the other cannot have.** Every flow write fires `checkPredictionAccuracy` against `prediction_snapshots` (`db/operations/days.ts:41`, `:56`). Pregnancy has nothing to predict, so it will never acquire an equivalent.

Applying the deletion test: merging removes nothing. The complexity relocates into `if (mode === pregnancy)` branches inside modules that would then each need both storage models, both marking semantics, and a side effect belonging to one mode. Locality gets worse, because a change to cycle marking would then risk pregnancy marking.

## Consequences

- Some code will keep looking duplicated. That is accepted, and this ADR is the reason.
- Extraction work happens *within* each mode rather than across them. The pure builder at `hooks/usePregnancyMarkedDates.ts:11-87` should be exported so the hook shell is the only database-bound part, mirroring what makes `services/cyclePredictionLogic.ts` testable.
- New shared surface needs justification against this ADR. Sharing a leaf that has one rule is fine; sharing a trunk that needs a mode conditional is not.

## When to revisit

Reopen this if the storage models converge, most plausibly by migrating `pregnancy_days` off JSON text columns onto normalized entry tables. At that point the first two discriminators fall away, and only the prediction side effect remains, which a merged module could reasonably carry as a no-op for pregnancy.
