import { and, eq, inArray } from "drizzle-orm";
import { getDrizzleDatabase } from "@/db/operations/setup";
import {
  days,
  medicationEntries,
  medications,
  moodEntries,
  moods,
  symptomEntries,
  symptoms,
} from "@/db/schema";
import { insertDay, getDay } from "@/db/operations/days";
import { birthControlOptions } from "@/constants/BirthControlTypes";

const db = getDrizzleDatabase();

/**
 * A Medication as recorded against a Day, with the detail that belongs to the
 * entry rather than to the catalogue item. Carrying it here is what lets
 * "took the pill at 08:00" be part of the day snapshot instead of a side store.
 */
export type LoggedMedication = {
  name: string;
  timeTaken?: string;
  notes?: string;
};

/**
 * The whole of what a user has recorded for one Day. See CONTEXT.md.
 *
 * This is the unit the app loads and saves. It is a view over several tables,
 * not a table itself.
 */
export type LoggedDay = {
  date: string;
  flow: number;
  notes: string;
  isCycleStart: boolean;
  isCycleEnd: boolean;
  intercourse: boolean;
  symptoms: string[];
  moods: string[];
  /** Includes birth control, which is a Medication like any other. */
  medications: LoggedMedication[];
};

export const emptyLoggedDay = (date: string): LoggedDay => ({
  date,
  flow: 0,
  notes: "",
  isCycleStart: false,
  isCycleEnd: false,
  intercourse: false,
  symptoms: [],
  moods: [],
  medications: [],
});

/** The birth control entry among a day's Medications, if one was logged. */
export function birthControlIn(day: LoggedDay): LoggedMedication | null {
  return (
    day.medications.find((medication) =>
      birthControlOptions.includes(medication.name),
    ) ?? null
  );
}

/** Everything else, by name. */
export function medicationsExcludingBirthControl(day: LoggedDay): string[] {
  return day.medications
    .filter((medication) => !birthControlOptions.includes(medication.name))
    .map((medication) => medication.name);
}

/**
 * Whether two snapshots differ in any way the user would recognise.
 *
 * Selection order and surrounding whitespace are not differences. Without
 * this, every keystroke's worth of trailing space would be a write.
 */
export function loggedDayChanged(a: LoggedDay, b: LoggedDay): boolean {
  const normalize = (day: LoggedDay) => ({
    ...day,
    notes: day.notes.trim(),
    symptoms: [...day.symptoms].sort(),
    moods: [...day.moods].sort(),
    medications: [...day.medications]
      .map((medication) => ({
        name: medication.name,
        timeTaken: medication.timeTaken?.trim() ?? "",
        notes: medication.notes?.trim() ?? "",
      }))
      .sort((x, y) => x.name.localeCompare(y.name)),
  });

  return JSON.stringify(normalize(a)) !== JSON.stringify(normalize(b));
}

/**
 * The catalogue row an entry names, or null if it is no longer there.
 *
 * drizzle's relational query returns the `one(...)` side as null when the row
 * is missing, and the row really can be missing: the app ships no
 * `PRAGMA foreign_keys`, so on device the constraint is not enforced and an
 * entry outlives a deleted Symptom, Mood or Medication. `drizzle/0004` exists
 * to clean those up, which is the proof they occur.
 *
 * Skipping them is what the four `innerJoin`s this replaces did implicitly. A
 * relational `with` hands them back instead, so the skip has to be written
 * down. Reading `.name` off one of these without checking is a crash on
 * opening a day, and it is not a crash `tsc` can see.
 */
function nameOf(item: { name: string } | null): string | null {
  return item?.name ?? null;
}

function loggedNames<Entry>(
  entries: Entry[],
  catalogueItem: (entry: Entry) => { name: string } | null,
): string[] {
  return entries.flatMap((entry) => {
    const name = nameOf(catalogueItem(entry));
    return name === null ? [] : [name];
  });
}

/**
 * Loads the whole Logged Day, in one query.
 *
 * Entry names are resolved in the database through the relations declared in
 * `db/schema.ts`. The path before #202 issued a query per entry after already
 * fetching the same Day row six times; #202 got that to four; this is one.
 */
export async function loadLoggedDay(date: string): Promise<LoggedDay> {
  const day = await db.query.days.findFirst({
    where: eq(days.date, date),
    with: {
      symptomEntries: { with: { symptom: true } },
      moodEntries: { with: { mood: true } },
      medicationEntries: { with: { medication: true } },
    },
  });
  if (!day) return emptyLoggedDay(date);

  return {
    date,
    flow: day.flow_intensity ?? 0,
    notes: day.notes ?? "",
    isCycleStart: day.is_cycle_start ?? false,
    isCycleEnd: day.is_cycle_end ?? false,
    intercourse: day.intercourse ?? false,
    symptoms: loggedNames(day.symptomEntries, (entry) => entry.symptom),
    moods: loggedNames(day.moodEntries, (entry) => entry.mood),
    medications: day.medicationEntries.flatMap((entry) => {
      const name = nameOf(entry.medication);
      if (name === null) return [];
      return [
        {
          name,
          ...(entry.time_taken ? { timeTaken: entry.time_taken } : {}),
          ...(entry.notes ? { notes: entry.notes } : {}),
        },
      ];
    }),
  };
}

type CatalogueTable = typeof symptoms | typeof moods | typeof medications;

/** Resolves names to catalogue ids, creating any the user has just invented. */
async function catalogueIdsByName(
  table: CatalogueTable,
  names: string[],
): Promise<Map<string, number>> {
  if (names.length === 0) return new Map();

  const existing = await db
    .select({ id: table.id, name: table.name })
    .from(table)
    .where(inArray(table.name, names));

  const byName = new Map(existing.map((row) => [row.name, row.id]));

  const missing = names.filter((name) => !byName.has(name));
  for (const name of missing) {
    const [created] = await db
      .insert(table)
      .values({ name, visible: true })
      .returning({ id: table.id, name: table.name });
    byName.set(created.name, created.id);
  }

  return byName;
}

/**
 * Saves the whole Logged Day: ensure the Day row, then reconcile its entries.
 *
 * That ordering is the rule the review found stated three times with two
 * different answers. db/quickBirthControl.ts created a missing Day;
 * useSyncEntries and useSyncMedicationEntries silently returned, so a first
 * edit to a brand new day dropped its symptoms and moods on the floor. This is
 * the one answer.
 *
 * Reconcile, not insert: names no longer selected have their entries removed,
 * and per-entry detail is updated in place.
 *
 * `checkedOn` is today, which is not `day.date` — a user can log a day in the
 * past. It reaches the prediction accuracy check that every flow write fires.
 */
export async function saveLoggedDay(
  day: LoggedDay,
  checkedOn: Date,
): Promise<void> {
  await insertDay(
    day.date,
    day.flow,
    checkedOn,
    day.notes,
    day.isCycleStart,
    day.isCycleEnd,
    day.intercourse,
  );

  const stored = await getDay(day.date);
  if (!stored) throw new Error(`Could not ensure the Day row for ${day.date}`);

  const [symptomIds, moodIds, medicationIds] = await Promise.all([
    catalogueIdsByName(symptoms, day.symptoms),
    catalogueIdsByName(moods, day.moods),
    catalogueIdsByName(
      medications,
      day.medications.map((medication) => medication.name),
    ),
  ]);

  await reconcileEntries(symptomEntryAccess, stored.id, [
    ...symptomIds.values(),
  ]);
  await reconcileEntries(moodEntryAccess, stored.id, [...moodIds.values()]);
  await reconcileMedicationEntries(stored.id, day.medications, medicationIds);
}

/**
 * One reconcile algorithm; the table-specific parts are the three accessors.
 * A generic over the two tables does not typecheck, because drizzle carries
 * each column's name in its type, and casting past that would be worse.
 */
type EntryAccess = {
  read: (dayId: number) => Promise<{ id: number; catalogueId: number }[]>;
  insert: (dayId: number, catalogueId: number) => Promise<void>;
  remove: (entryIds: number[]) => Promise<void>;
};

async function reconcileEntries(
  access: EntryAccess,
  dayId: number,
  wantedIds: number[],
) {
  const existing = await access.read(dayId);
  const have = new Set(existing.map((row) => row.catalogueId));

  for (const catalogueId of wantedIds) {
    if (!have.has(catalogueId)) await access.insert(dayId, catalogueId);
  }

  const wanted = new Set(wantedIds);
  const surplus = existing
    .filter((row) => !wanted.has(row.catalogueId))
    .map((row) => row.id);
  if (surplus.length > 0) await access.remove(surplus);
}

const symptomEntryAccess: EntryAccess = {
  read: (dayId) =>
    db
      .select({ id: symptomEntries.id, catalogueId: symptomEntries.symptom_id })
      .from(symptomEntries)
      .where(eq(symptomEntries.day_id, dayId)),
  insert: async (dayId, catalogueId) => {
    await db
      .insert(symptomEntries)
      .values({ day_id: dayId, symptom_id: catalogueId });
  },
  remove: async (entryIds) => {
    await db.delete(symptomEntries).where(inArray(symptomEntries.id, entryIds));
  },
};

const moodEntryAccess: EntryAccess = {
  read: (dayId) =>
    db
      .select({ id: moodEntries.id, catalogueId: moodEntries.mood_id })
      .from(moodEntries)
      .where(eq(moodEntries.day_id, dayId)),
  insert: async (dayId, catalogueId) => {
    await db
      .insert(moodEntries)
      .values({ day_id: dayId, mood_id: catalogueId });
  },
  remove: async (entryIds) => {
    await db.delete(moodEntries).where(inArray(moodEntries.id, entryIds));
  },
};

async function reconcileMedicationEntries(
  dayId: number,
  wanted: LoggedMedication[],
  idsByName: Map<string, number>,
) {
  const existing = await db
    .select({
      id: medicationEntries.id,
      medicationId: medicationEntries.medication_id,
      timeTaken: medicationEntries.time_taken,
      notes: medicationEntries.notes,
    })
    .from(medicationEntries)
    .where(eq(medicationEntries.day_id, dayId));

  const existingByMedication = new Map(
    existing.map((row) => [row.medicationId, row]),
  );

  for (const medication of wanted) {
    const medicationId = idsByName.get(medication.name);
    if (medicationId === undefined) continue;

    const timeTaken = medication.timeTaken?.trim() || null;
    const notes = medication.notes?.trim() || null;
    const current = existingByMedication.get(medicationId);

    if (!current) {
      await db.insert(medicationEntries).values({
        day_id: dayId,
        medication_id: medicationId,
        time_taken: timeTaken,
        notes,
      });
    } else if (current.timeTaken !== timeTaken || current.notes !== notes) {
      await db
        .update(medicationEntries)
        .set({ time_taken: timeTaken, notes })
        .where(
          and(
            eq(medicationEntries.day_id, dayId),
            eq(medicationEntries.medication_id, medicationId),
          ),
        );
    }
  }

  const wantedIds = new Set(
    wanted
      .map((medication) => idsByName.get(medication.name))
      .filter((id): id is number => id !== undefined),
  );
  const surplus = existing
    .filter((row) => !wantedIds.has(row.medicationId))
    .map((row) => row.id);
  if (surplus.length > 0) {
    await db
      .delete(medicationEntries)
      .where(inArray(medicationEntries.id, surplus));
  }
}

export type SaveOutcome =
  | { status: "saved"; day: LoggedDay }
  | { status: "unchanged" }
  | { status: "superseded" }
  | { status: "wrong-day" }
  | { status: "failed"; error: unknown };

export type LoggedDaySaver = {
  /** Sets the baseline for change detection and names the day now open. */
  reset(day: LoggedDay): void;
  /** Debounced and guarded. Resolves with what actually happened. */
  schedule(day: LoggedDay): Promise<SaveOutcome>;
  /**
   * Writes a pending edit now instead of waiting out the debounce.
   *
   * This is what a day change wants. The edit was made against the day that
   * is closing, so writing it to that day is right; cancelling would drop it,
   * which is what made a flow selected and abandoned inside 100ms vanish.
   * Resolves `unchanged` when there was nothing pending.
   */
  flush(): Promise<SaveOutcome>;
  /** Discards a pending edit. For teardown that should not write. */
  cancel(): void;
  /**
   * Resolves when no write is outstanding, convergence included.
   *
   * `schedule` resolves as soon as the caller's own snapshot has been
   * written, which is what a save message wants. That is not the same moment
   * the day stops changing, because a revert arriving mid-write triggers a
   * further pass. Anything that needs the settled state waits on this.
   */
  settled(): Promise<void>;
};

export const DEFAULT_SAVE_DELAY_MS = 100;

/**
 * Owns when a Logged Day is written, which is part of what saving promises,
 * not an implementation detail of a screen.
 *
 * Four rules, all of which used to live in a React effect and could not be
 * tested:
 *
 * - **Debounce.** A burst of edits collapses into one write.
 * - **Back where it started.** A burst that ends at the baseline writes
 *   nothing, including the pending write it began with. Selecting Heavy and
 *   reverting to None inside the debounce leaves nothing behind.
 * - **In flight.** A save already running is never re-entered.
 * - **Right day, before.** A snapshot for a day other than the one now open is
 *   not written. The user switching days mid-debounce must not write the old
 *   day's contents against the new day.
 * - **Right day, after.** The baseline only moves forward if the open day is
 *   still the one that was saved.
 *
 * The debounce elapsing is not the only reason to write. `flush` runs the
 * same pending write immediately, under the same four rules, which is what
 * closing a day needs.
 */
export function createLoggedDaySaver(options: {
  /**
   * Reads the clock at write time, for the prediction accuracy check.
   *
   * Required and injected rather than defaulted, so the clock is read at the
   * app's edge and a test can pin it. A saver outlives any single write, so
   * it needs a function rather than a value.
   */
  now: () => Date;
  delayMs?: number;
}): LoggedDaySaver {
  const { now } = options;
  const delayMs = options.delayMs ?? DEFAULT_SAVE_DELAY_MS;

  let baseline: LoggedDay | null = null;
  // The last snapshot the caller reported, whatever came of it. Kept even for
  // calls that write nothing, because a revert arriving mid-write is exactly
  // the case that has no pending timer left to disarm.
  let desired: LoggedDay | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: {
    day: LoggedDay;
    resolve: (outcome: SaveOutcome) => void;
  } | null = null;
  let inFlight = false;
  let running: Promise<unknown> = Promise.resolve();

  const takePending = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    const taken = pending;
    pending = null;
    return taken;
  };

  const clearPending = (outcome: SaveOutcome) => {
    takePending()?.resolve(outcome);
  };

  /**
   * The write itself, whether the debounce elapsed or a flush asked for it
   * now. Resolves whoever called `schedule` and returns the same outcome to
   * whoever asked for the flush.
   */
  /** Writes `day`, moving the baseline with it if that day is still open. */
  const write = async (day: LoggedDay) => {
    inFlight = true;
    try {
      // now() at write time, not at schedule time: the accuracy check records
      // when the outcome became known, and a converge pass can run later.
      await saveLoggedDay(day, now());
      if (baseline?.date === day.date) baseline = day;
    } finally {
      inFlight = false;
    }
  };

  /**
   * Converges on what the caller last asked for.
   *
   * A save takes long enough for the user to change their mind inside it, and
   * once it has started there is no timer to disarm. Rather than queueing,
   * which needs its own ordering rules, each completed write checks whether
   * the answer has moved and writes again if it has. It terminates because
   * every pass sets the baseline to what it just wrote.
   */
  const converge = async () => {
    while (
      desired &&
      baseline &&
      desired.date === baseline.date &&
      loggedDayChanged(desired, baseline)
    ) {
      try {
        await write(desired);
      } catch {
        return; // the next edit or day-open corrects it
      }
    }
  };

  const runPending = async (): Promise<SaveOutcome> => {
    const taken = takePending();
    if (!taken) return { status: "unchanged" };

    const { day, resolve } = taken;
    const settle = (outcome: SaveOutcome) => {
      resolve(outcome);
      return outcome;
    };

    if (inFlight) return settle({ status: "superseded" });
    if (baseline && baseline.date !== day.date) {
      return settle({ status: "wrong-day" });
    }

    try {
      await write(day);
    } catch (error) {
      return settle({ status: "failed", error });
    }

    const outcome = settle({ status: "saved", day });
    await converge();
    return outcome;
  };

  return {
    reset(day) {
      clearPending({ status: "superseded" });
      baseline = day;
      desired = day;
    },

    flush() {
      running = runPending();
      return running as Promise<SaveOutcome>;
    },

    settled() {
      return running.then(() => undefined);
    },

    cancel() {
      clearPending({ status: "superseded" });
    },

    schedule(day) {
      // Deliberately does not disarm. A pending edit belongs to the day it
      // was made against, and this call is about a different day; discarding
      // it here is the bug #162 fixed.
      if (baseline && baseline.date !== day.date) {
        return Promise.resolve({ status: "wrong-day" as const });
      }

      // Disarms, because this one means there is nothing left to write. The
      // user backed out of an edit inside the debounce, so any pending write
      // is now for a value they have already abandoned (#214).
      desired = day;

      if (baseline && !loggedDayChanged(day, baseline)) {
        clearPending({ status: "superseded" });
        return Promise.resolve({ status: "unchanged" as const });
      }

      clearPending({ status: "superseded" });

      return new Promise<SaveOutcome>((resolve) => {
        pending = { day, resolve };
        timer = setTimeout(() => {
          running = runPending();
          void running;
        }, delayMs);
      });
    },
  };
}
