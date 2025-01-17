import { getDrizzleDatabase } from "@/db/operations/setup";
import { moodEntries } from "@/db/schema";

const db = getDrizzleDatabase();

export const getAllMoodEntries = async () => {
  const entries = db.select().from(moodEntries);
  return entries;
};

export const deleteAllMoodEntries = async () => {
  await db.delete(moodEntries);
};
