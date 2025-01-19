import { getDrizzleDatabase } from "@/db/operations/setup";
import { moodEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const db = getDrizzleDatabase();

export const getAllMoodEntries = async () => {
  const entries = db.select().from(moodEntries);
  return entries;
};

export const getMoodEntriesForDay = async (day_id: number) => {
  const entries = await db.query.moodEntries.findMany({
    where: eq(moodEntries.day_id, day_id),
  });
  return entries;
};

export const updateMoodEntry = async (
  day_id: number,
  mood_id: number,
  intensity?: number,
  notes?: string,
) => {
  let updateData: object = { day_id, mood_id };
  if (intensity) {
    updateData = { ...updateData, intensity };
  }
  if (notes) {
    updateData = { ...updateData, notes };
  }
  await db.update(moodEntries)
    .set(updateData)
    .where(and(eq(moodEntries.day_id, day_id), eq(moodEntries.mood_id, mood_id)));
};

export const insertMoodEntry = async (
  day_id: number,
  mood_id: number,
  intensity?: number,
  notes?: string,
) => {
  const existingEntries = await getMoodEntriesForDay(day_id);
  const existingEntry = existingEntries.find(entry => entry.mood_id === mood_id);    
  
  if (existingEntry) {
    await updateMoodEntry(day_id, mood_id, intensity, notes);    
  } else {
    await db.insert(moodEntries).values({        
      day_id,
      mood_id,
      intensity,
      notes,
    }).execute();
  }
};

export const deleteMoodEntry = async (id: number) => {
  await db.delete(moodEntries).where(eq(moodEntries.id, id));
};

export const deleteAllMoodEntries = async () => {
  await db.delete(moodEntries);
};
