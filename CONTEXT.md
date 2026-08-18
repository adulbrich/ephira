# Context

The ubiquitous language for ephira. When code, an issue title, a test name or a commit message names one of these concepts, it uses the word defined here.

This file is maintained lazily: terms are added when a design decision actually resolves one, not upfront. See `docs/agents/domain.md` for how the engineering skills consume it.

## Core terms

**Day**: a calendar date the user has logged something against, stored in the `days` table and keyed by a unique `date` string. A Day exists only once something is logged for it.

**Logged Day**: the whole of what the user has recorded for one Day: flow, notes, cycle start/end markers, intercourse, and the Moods, Symptoms and Medications selected. This is the unit the app loads and saves as one snapshot. It is a view over several tables, not a table itself.

**Section**: one loggable area of a Logged Day, as presented in the day view: Flow, Moods, Symptoms, Medications, Birth Control, Intercourse, Notes, and in pregnancy mode Kicks and Appointments. Sections are a property of what can be logged, not of which tracking mode is active; each mode renders its own subset. One Section is expanded at a time.

**Selected Date**: which date the day view is showing. Shared, because the calendar picks it and the day view reads it. Only the date is shared: the Selected Date is not a Logged Day, and the day's contents belong to whatever is displaying them.

**Catalogue**: the set of Moods, Symptoms or Medications a user can choose from. Distinct from the entries that reference them. The Catalogue is edited rarely, in settings, while entries are written constantly, while logging. `moods`, `symptoms` and `medications` are Catalogue tables.

**Entry**: a single recorded selection joining a Day to a Catalogue item: `mood_entries`, `symptom_entries`, `medication_entries`. An Entry may carry its own detail, such as a Medication's `time_taken`.

**Cycle**: a run of consecutive Days with flow, bounded either by the `is_cycle_start` / `is_cycle_end` markers the user sets or by gaps between logged flow. There is exactly one definition of how flow groups into Cycles, and it lives in `services/cyclePredictionLogic.ts`. Days with no flow are not part of a Cycle and do not bridge two of them. A Cycle counts towards prediction only once it reaches `MIN_CONSECUTIVE_DAYS`, and that same count is what gates predictions everywhere they are gated.

**Prediction**: a forecast of a future Day with flow, carrying a confidence. Predictions are derived, never authored.

**Prediction Snapshot**: a record of what was predicted, and when, kept so that accuracy can be measured after the fact. Identified by `(prediction_made_date, predicted_date)`. Its purpose is a time series: overwriting history would make the accuracy metric measure something else. `(prediction_made_date, predicted_date)` is a unique index, so that identity is enforced by the schema rather than by the code that writes it. Within a single day the stored generation is reconciled to what is currently forecast: confidence updates in place, and a date no longer forecast is retracted. Once a Snapshot's outcome has been measured it is never retracted and its outcome is never rewritten, because that is the history the metric reads.

**Marked Dates**: the value handed to the calendar describing how each date should be drawn. Cycle mode encodes runs, with start and end caps, adjacency to neighbouring days, and confidence-scaled opacity for Prediction overlays. Pregnancy mode encodes point events. Both modes produce the same value type; they do not share the rules for building it.

**Tracking Mode**: which of the two experiences the app is presenting, cycle or pregnancy. Durably a setting; expressed at runtime as which route group is mounted.

**Gestational Age**: the derived view of a pregnancy: given a stored start date, an offset and a reference day, it yields the pregnancy day, week, day within the week, trimester, due date and progress. Derived, never stored. The inverse mapping, from each setup answer back to a start date and offset, belongs to the same module. The week is not capped at 40, because a pregnancy can run past its due date; accessors that need a bounded week, such as baby size and week content, clamp for themselves. Progress and days remaining are bounded, since neither means anything past full term.

## Terms we avoid

**`Mood`, `Symptom`, `Medication` as UI state.** These names belong to the Catalogue entities in `db/schema.ts`. `constants/Interfaces.ts` currently also uses them for selection state, so `Mood` means two different things depending on the import. Selection state is part of a Logged Day and is named accordingly.

**"Component", "service", "wrapper", "layer", "boundary".** Architecture discussion uses the vocabulary in `docs/agents/domain.md` and the `codebase-design` skill: module, interface, implementation, depth, seam, adapter, leverage, locality.

**"Period" as a synonym for Cycle.** `periodData` in `constants/Interfaces.ts` is a drawing instruction for the calendar, not a domain concept. Say Cycle for the domain, Marked Dates for the drawing.
