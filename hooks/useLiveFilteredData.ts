import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { getDrizzleDatabase } from "@/db/database";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import type { DayData } from "@/constants/Interfaces";
import { useEffect, useState } from "react";
import { useDatabaseChangeNotifier } from "@/stores/calendar-storage";
import { daysFromJoinedRows } from "@/db/dayRows";

export const useLiveFilteredData = (filters: string[]) => {
  const db = getDrizzleDatabase();
  // used to force useLiveQuery to re-run since it doesn't consistently recognize
  // changes to the visibility of symptoms, moods, and medications
  const dbChange = useDatabaseChangeNotifier().databaseChange;
  const [filteredData, setFilteredData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    setLoading(true);
    if (data && filters.length > 0) {
      setFilteredData(daysFromJoinedRows(data));
    } else {
      setFilteredData([]);
    }
    setLoading(false);
  }, [data, filters]);

  return { loading, filteredData };
};
