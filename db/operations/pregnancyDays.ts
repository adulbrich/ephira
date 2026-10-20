import { getDrizzleDatabase } from "@/db/operations/setup";
import { pregnancyDays } from "@/db/schema";
import { eq } from "drizzle-orm";

const db = getDrizzleDatabase();

export const getPregnancyDay = async (date: string) => {
  return db.query.pregnancyDays.findFirst({
    where: eq(pregnancyDays.date, date),
  });
};

/**
 * A `symptoms` or `moods` column read back into names.
 *
 * `upsertPregnancyDay` writes these with JSON.stringify, so anything else is a
 * row it did not write. That reads as no names rather than throwing: the
 * export reads every row at once, and one unreadable column must not cost
 * the user the rest.
 */
export const parseStoredNames = (stored: string | null): string[] => {
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((name): name is string => typeof name === "string")
      : [];
  } catch {
    return [];
  }
};

export const getAllPregnancyDays = async () => {
  return db.select().from(pregnancyDays).orderBy(pregnancyDays.date);
};

export const upsertPregnancyDay = async (
  date: string,
  kicks?: number | null,
  symptoms?: string[],
  moods?: string[],
  notes?: string,
) => {
  const existing = await getPregnancyDay(date);
  const symptomsJson = symptoms ? JSON.stringify(symptoms) : null;
  const moodsJson = moods ? JSON.stringify(moods) : null;

  if (existing) {
    await db
      .update(pregnancyDays)
      .set({
        kicks: kicks ?? null,
        symptoms: symptomsJson,
        moods: moodsJson,
        notes: notes ?? null,
      })
      .where(eq(pregnancyDays.date, date));
  } else {
    await db.insert(pregnancyDays).values({
      date,
      kicks: kicks ?? null,
      symptoms: symptomsJson,
      moods: moodsJson,
      notes: notes ?? null,
    });
  }
};

export const deletePregnancyDay = async (date: string) => {
  await db.delete(pregnancyDays).where(eq(pregnancyDays.date, date));
};
