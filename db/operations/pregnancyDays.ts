import { getDrizzleDatabase } from "@/db/operations/setup";
import { pregnancyDays } from "@/db/schema";
import { eq } from "drizzle-orm";

const db = getDrizzleDatabase();

export const getPregnancyDay = async (date: string) => {
  return db.query.pregnancyDays.findFirst({
    where: eq(pregnancyDays.date, date),
  });
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
