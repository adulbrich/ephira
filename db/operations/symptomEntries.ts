import { getDrizzleDatabase } from "@/db/operations/setup";
import { symptomEntries } from "@/db/schema";

const db = getDrizzleDatabase();

export const getAllSymptomEntries = async () => {
  const entries = db.select().from(symptomEntries);
  return entries;
};
