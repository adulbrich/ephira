import { and, eq, inArray } from "drizzle-orm";
import { getDrizzleDatabase } from "@/db/operations/setup";
import {
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
 * Loads the whole Logged Day.
 *
 * Entry names are resolved by joining in the database. The path this replaces
 * issued a query per entry after already fetching the same Day row six times.
 */
export async function loadLoggedDay(date: string): Promise<LoggedDay> {
  const day = await getDay(date);
  if (!day) return emptyLoggedDay(date);

  const [symptomRows, moodRows, medicationRows] = await Promise.all([
    db
      .select({ name: symptoms.name })
      .from(symptomEntries)
      .innerJoin(symptoms, eq(symptomEntries.symptom_id, symptoms.id))
      .where(eq(symptomEntries.day_id, day.id)),
    db
      .select({ name: moods.name })
      .from(moodEntries)
      .innerJoin(moods, eq(moodEntries.mood_id, moods.id))
      .where(eq(moodEntries.day_id, day.id)),
    db
      .select({
        name: medications.name,
        timeTaken: medicationEntries.time_taken,
        notes: medicationEntries.notes,
      })
      .from(medicationEntries)
      .innerJoin(
        medications,
        eq(medicationEntries.medication_id, medications.id),
      )
      .where(eq(medicationEntries.day_id, day.id)),
  ]);

  return {
    date,
    flow: day.flow_intensity ?? 0,
    notes: day.notes ?? "",
    isCycleStart: day.is_cycle_start ?? false,
    isCycleEnd: day.is_cycle_end ?? false,
    intercourse: day.intercourse ?? false,
    symptoms: symptomRows.map((row) => row.name),
    moods: moodRows.map((row) => row.name),
    medications: medicationRows.map((row) => ({
      name: row.name,
      ...(row.timeTaken ? { timeTaken: row.timeTaken } : {}),
      ...(row.notes ? { notes: row.notes } : {}),
    })),
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
 */
export async function saveLoggedDay(day: LoggedDay): Promise<void> {
  await insertDay(
    day.date,
    day.flow,
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
  cancel(): void;
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
 * - **In flight.** A save already running is never re-entered.
 * - **Right day, before.** A snapshot for a day other than the one now open is
 *   not written. The user switching days mid-debounce must not write the old
 *   day's contents against the new day.
 * - **Right day, after.** The baseline only moves forward if the open day is
 *   still the one that was saved.
 */
export function createLoggedDaySaver(
  options: { delayMs?: number } = {},
): LoggedDaySaver {
  const delayMs = options.delayMs ?? DEFAULT_SAVE_DELAY_MS;

  let baseline: LoggedDay | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let supersede: ((outcome: SaveOutcome) => void) | null = null;
  let inFlight = false;

  const clearPending = (outcome: SaveOutcome) => {
    if (timer) clearTimeout(timer);
    timer = null;
    const resolvePending = supersede;
    supersede = null;
    resolvePending?.(outcome);
  };

  return {
    reset(day) {
      clearPending({ status: "superseded" });
      baseline = day;
    },

    cancel() {
      clearPending({ status: "superseded" });
    },

    schedule(day) {
      if (baseline && baseline.date !== day.date) {
        return Promise.resolve({ status: "wrong-day" as const });
      }
      if (baseline && !loggedDayChanged(day, baseline)) {
        return Promise.resolve({ status: "unchanged" as const });
      }

      clearPending({ status: "superseded" });

      return new Promise<SaveOutcome>((resolve) => {
        supersede = resolve;
        timer = setTimeout(async () => {
          timer = null;
          supersede = null;

          if (inFlight) return resolve({ status: "superseded" });
          if (baseline && baseline.date !== day.date) {
            return resolve({ status: "wrong-day" });
          }

          inFlight = true;
          try {
            await saveLoggedDay(day);
            if (baseline?.date === day.date) baseline = day;
            resolve({ status: "saved", day });
          } catch (error) {
            resolve({ status: "failed", error });
          } finally {
            inFlight = false;
          }
        }, delayMs);
      });
    },
  };
}
