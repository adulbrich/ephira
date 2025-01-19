import { getDrizzleDatabase } from "@/db/operations/setup";
import { symptomEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const db = getDrizzleDatabase();

export const getAllSymptomEntries = async () => {
  const entries = db.select().from(symptomEntries);
  return entries;
};

export const getSymptomEntriesForDay = async (day_id: number) => {
  const entries = await db.query.symptomEntries.findMany({
    where: eq(symptomEntries.day_id, day_id),
  });
  return entries;
};

export const updateSymptomEntry = async (
  day_id: number,
  symptom_id: number,
  intensity?: number,
  notes?: string
) => {
  let updateData: object = { day_id, symptom_id };
  if (intensity) {
    updateData = { ...updateData, intensity };
  }
  if (notes) {
    updateData = { ...updateData, notes };
  }
  await db
    .update(symptomEntries)
    .set(updateData)
    .where(
      and(
        eq(symptomEntries.day_id, day_id),
        eq(symptomEntries.symptom_id, symptom_id)
      )
    );
};

export const insertSymptomEntry = async (
  day_id: number,
  symptom_id: number,
  intensity?: number,
  notes?: string
) => {
  const existingEntries = await getSymptomEntriesForDay(day_id);
  const existingEntry = existingEntries.find(
    (entry) => entry.symptom_id === symptom_id
  );

  if (existingEntry) {
    await updateSymptomEntry(day_id, symptom_id, intensity, notes);
  } else {
    await db
      .insert(symptomEntries)
      .values({
        day_id,
        symptom_id,
        intensity,
        notes,
      })
      .execute();
  }
};

export const deleteSymptomEntry = async (id: number) => {
  await db.delete(symptomEntries).where(eq(symptomEntries.id, id));
};

export const deleteAllSymptomEntries = async () => {
  await db.delete(symptomEntries).execute();
};
