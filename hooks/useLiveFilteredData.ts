import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { getDrizzleDatabase } from "@/db/database";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import type { DayData } from "@/constants/Interfaces";
import { useEffect, useState } from "react";

function formatSQLData(data: any) {
  const formattedData = data.reduce((acc: any, row: any) => {
    const { days, moodQuery, symptomQuery, medicationQuery } = row;

    let dayEntry = acc.find((entry: any) => entry.id === days.id);

    if (!dayEntry) {
      dayEntry = {
        ...days,
        moods: [],
        symptoms: [],
        medications: [],
      };
      acc.push(dayEntry);
    }

    if (moodQuery && !dayEntry.moods.includes(moodQuery.name)) {
      dayEntry.moods.push(moodQuery.name);
    }

    if (symptomQuery && !dayEntry.symptoms.includes(symptomQuery.name)) {
      dayEntry.symptoms.push(symptomQuery.name);
    }

    if (
      medicationQuery &&
      !dayEntry.medications.includes(medicationQuery.name)
    ) {
      dayEntry.medications.push(medicationQuery.name);
    }

    return acc;
  }, []);

  return formattedData;
}

export const useLiveFilteredData = (
  filters: { label: string; value: string }[],
) => {
  const db = getDrizzleDatabase();
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
    .as("medicationQuery");

  const { data } = useLiveQuery(
    db
      .select()
      .from(schema.days)
      .leftJoin(moodQuery, eq(schema.days.id, moodQuery.day_id))
      .leftJoin(symptomQuery, eq(schema.days.id, symptomQuery.day_id))
      .leftJoin(medicationQuery, eq(schema.days.id, medicationQuery.day_id))
      .orderBy(schema.days.date),
  );

  useEffect(() => {
    setLoading(true);
    if (data && filters.length > 0) {
      const formattedData = formatSQLData(data);
      setFilteredData(formattedData as DayData[]);
    } else {
      setFilteredData([]);
    }
    setLoading(false);
  }, [data, filters]);

  return filteredData;
};
