import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { getDrizzleDatabase } from "@/db/database";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import type { DayData } from "@/constants/Interfaces";
import { useMemo } from "react";
import { useDatabaseChangeNotifier } from "@/stores/calendar-storage";
import { daysFromJoinedRows } from "@/db/dayRows";

/**
 * The logged Days, live, already folded.
 *
 * That clause is the whole interface. It used to take a `filters` argument that
 * did not filter -- its only use was `filters.length > 0`, deciding whether to
 * return the Days at all -- and to return a `loading` flag that was set true
 * and false in one synchronous body, so React never committed a render with it
 * true. Both were threaded through three modules to reach a calendar prop.
 *
 * Whether anything should be drawn is the caller's decision, next to the filter
 * list that determines it, where "no filters selected" and "nothing logged" can
 * still be told apart.
 */
export const useLoggedDaysLive = (): DayData[] => {
  const db = getDrizzleDatabase();
  // used to force useLiveQuery to re-run since it doesn't consistently recognize
  // changes to the visibility of symptoms, moods, and medications
  const dbChange = useDatabaseChangeNotifier().databaseChange;

  const moodQuery = db
    .select({
      day_id: schema.moodEntries.day_id,
      id: schema.moods.id,
      name: schema.moods.name,
    })
    .from(schema.moodEntries)
    .innerJoin(schema.moods, eq(schema.moodEntries.mood_id, schema.moods.id))
    .where(eq(schema.moods.visible, true))
    .as("moodQuery");

  const symptomQuery = db
    .select({
      day_id: schema.symptomEntries.day_id,
      id: schema.symptoms.id,
      name: schema.symptoms.name,
    })
    .from(schema.symptomEntries)
    .innerJoin(
      schema.symptoms,
      eq(schema.symptomEntries.symptom_id, schema.symptoms.id),
    )
    .where(eq(schema.symptoms.visible, true))
    .as("symptomQuery");

  const medicationQuery = db
    .select({
      day_id: schema.medicationEntries.day_id,
      id: schema.medications.id,
      name: schema.medications.name,
    })
    .from(schema.medicationEntries)
    .innerJoin(
      schema.medications,
      eq(schema.medicationEntries.medication_id, schema.medications.id),
    )
    .where(eq(schema.medications.visible, true))
    .as("medicationQuery");

  const { data } = useLiveQuery(
    db
      .select()
      .from(schema.days)
      .leftJoin(moodQuery, eq(schema.days.id, moodQuery.day_id))
      .leftJoin(symptomQuery, eq(schema.days.id, symptomQuery.day_id))
      .leftJoin(medicationQuery, eq(schema.days.id, medicationQuery.day_id))
      .orderBy(schema.days.date),
    [dbChange],
  );

  return useMemo(() => (data ? daysFromJoinedRows(data) : []), [data]);
};
