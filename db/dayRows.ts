import type { DayData } from "@/constants/Interfaces";
import type { Day } from "@/db/schema";

/**
 * A catalogue row as the visibility-filtered subqueries return it, or null
 * when this row of the outer join has none of that kind.
 */
type JoinedCatalogueItem = { day_id: number; id: number; name: string } | null;

/**
 * One row of the three-way left join in `useLoggedDaysLive`.
 *
 * Written out rather than derived from the query, because the query lives in
 * the hook and this module is the thing being tested. The call site is what
 * checks it: drizzle's row type has to be assignable to this. Note what that
 * does and does not prove — it proves every field declared here exists on the
 * real row with a compatible type; it does not prove this declares everything
 * the row has. A narrower type passes silently.
 */
export type JoinedDayRow = {
  days: Day;
  moodQuery: JoinedCatalogueItem;
  symptomQuery: JoinedCatalogueItem;
  medicationQuery: JoinedCatalogueItem;
};

/**
 * Folds the rows of that join into one entry per Day.
 *
 * Three left joins against the same Day return the cross product: a day with
 * two Moods and three Symptoms arrives as six rows, each Mood paired with each
 * Symptom. Collapsing that back is the entire job. Names are deduped, in first
 * appearance order.
 */
export function daysFromJoinedRows(rows: JoinedDayRow[]): DayData[] {
  const byId = new Map<number, DayData>();

  for (const { days, moodQuery, symptomQuery, medicationQuery } of rows) {
    const existing = byId.get(days.id);
    const day = existing ?? {
      ...days,
      moods: [],
      symptoms: [],
      medications: [],
    };
    if (!existing) byId.set(days.id, day);

    push(day.moods, moodQuery);
    push(day.symptoms, symptomQuery);
    push(day.medications, medicationQuery);
  }

  return [...byId.values()];
}

function push(names: string[] | undefined, item: JoinedCatalogueItem) {
  if (!names || !item) return;
  if (!names.includes(item.name)) names.push(item.name);
}
