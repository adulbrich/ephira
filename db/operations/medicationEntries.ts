import { getDrizzleDatabase } from "@/db/operations/setup";
import { medicationEntries } from "@/db/schema";

const db = getDrizzleDatabase();

export const getAllMedicationEntries = async () => {
  const entries = db.select().from(medicationEntries);
  return entries;
};

export const deleteAllMedicationEntries = async () => {
  await db.delete(medicationEntries);
};
