import { getAllDays } from "@/db/database";
import type { DayData } from "@/constants/Interfaces";

/** A `days` row as the database returns it, with its nullable columns. */
type StoredDay = {
  id: number;
  date: string;
  flow_intensity: number | null;
  is_cycle_start?: boolean | null;
  is_cycle_end?: boolean | null;
  intercourse?: boolean | null;
  notes?: string | null;
};

/**
 * The Days with flow, oldest first, with the nullable columns resolved.
 *
 * This normalisation existed twice, verbatim, in `hooks/useFetchFlowData.ts`
 * and `services/cyclePredictions.ts`. It is one rule about what the cycle
 * intelligence is allowed to assume, so it has one home.
 */
export function normaliseFlowDays(days: StoredDay[]): DayData[] {
  return days
    .filter((day) => day.flow_intensity)
    .map((day) => ({
      ...day,
      flow_intensity: day.flow_intensity ?? 0,
      is_cycle_start: day.is_cycle_start ?? undefined,
      is_cycle_end: day.is_cycle_end ?? undefined,
      notes: day.notes ?? undefined,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * The flow Days, loaded.
 *
 * Nothing owned this before. The only thing that loaded them was a
 * `useFocusEffect` inside the home screen's circular chart, so the cycle tab --
 * which reads the same Days to compute its phase and its stats -- refreshed its
 * Predictions on a database change and recomputed everything else from whatever
 * the chart had last left in the store.
 */
export async function loadFlowDays(): Promise<DayData[]> {
  return normaliseFlowDays(await getAllDays());
}
