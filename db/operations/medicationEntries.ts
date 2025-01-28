import { getDrizzleDatabase } from "@/db/operations/setup";
import { medicationEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const db = getDrizzleDatabase();

export const getAllMedicationEntries = async () => {
  const entries = db.select().from(medicationEntries);
  return entries;
};

export const getMedicationEntriesForDay = async (day_id: number) => {
  const entries = await db.query.medicationEntries.findMany({
    where: eq(medicationEntries.day_id, day_id),
  });
  return entries;
};

export const updateMedicationEntry = async (
  day_id: number,
  medication_id: number,
  time_taken?: string | null,
  notes?: string | null,
) => {
  let updateData: object = { day_id, medication_id };
  if (time_taken !== null && time_taken !== undefined) {
    updateData = { ...updateData, time_taken };
  }
  if (notes !== null && notes !== undefined) {
    updateData = { ...updateData, notes };
  }
  await db
    .update(medicationEntries)
    .set(updateData)
    .where(
      and(
        eq(medicationEntries.day_id, day_id),
        eq(medicationEntries.medication_id, medication_id),
      ),
    );
};

export const insertMedicationEntry = async (
  day_id: number,
  medication_id: number,
  time_taken?: string,
  notes?: string,
) => {
  const existingEntries = await getMedicationEntriesForDay(day_id);
  const existingEntry = existingEntries.find(
    (entry) => entry.medication_id === medication_id,
  );

  const sanitizedTimeTaken = time_taken?.trim() || null;
  const sanitizedNotes = notes?.trim() || null;

  if (existingEntry) {
    await updateMedicationEntry(
      day_id,
      medication_id,
      sanitizedTimeTaken,
      sanitizedNotes,
    );
  } else {
    await db
      .insert(medicationEntries)
      .values({
        day_id,
        medication_id,
        time_taken: sanitizedTimeTaken,
        notes: sanitizedNotes,
      })
      .execute();
  }
};

export const deleteMedicationEntry = async (id: number) => {
  await db.delete(medicationEntries).where(eq(medicationEntries.id, id));
};

export const deleteAllMedicationEntries = async () => {
  await db.delete(medicationEntries);
};
