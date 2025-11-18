import { getDrizzleDatabase } from "@/db/operations/setup";
import { days } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkPredictionAccuracy } from "@/db/operations/predictionSnapshots";

const db = getDrizzleDatabase();

export const getDay = async (date: string) => {
  const day = await db.query.days.findFirst({
    where: eq(days.date, date),
  });
  return day;
};

export const getAllDays = async () => {
  const allDays = await db.select().from(days);
  return allDays;
};

export const updateDay = async (
  date: string,
  flowIntensity: number,
  notes?: string | null,
  is_cycle_start?: boolean,
  is_cycle_end?: boolean,
) => {
  await db
    .update(days)
    .set({
      flow_intensity: flowIntensity,
      notes: notes ?? null,
      is_cycle_start: is_cycle_start,
      is_cycle_end: is_cycle_end,
    })
    .where(eq(days.date, date));

  // Check prediction accuracy when flow is logged
  try {
    await checkPredictionAccuracy(date, flowIntensity > 0);
  } catch (error) {
    console.error("Error checking prediction accuracy:", error);
    // Don't fail the whole operation if accuracy checking fails
  }
};

export const updateDayFlow = async (date: string, flowIntensity: number) => {
  await db
    .update(days)
    .set({ flow_intensity: flowIntensity })
    .where(eq(days.date, date));

  // Check prediction accuracy when flow is logged
  try {
    await checkPredictionAccuracy(date, flowIntensity > 0);
  } catch (error) {
    console.error("Error checking prediction accuracy:", error);
    // Don't fail the whole operation if accuracy checking fails
  }
};

export const updateDayCycleStart = async (
  date: string,
  isCycleStart: boolean,
) => {
  await db
    .update(days)
    .set({ is_cycle_start: isCycleStart })
    .where(eq(days.date, date));
};

export const updateDayCycleEnd = async (date: string, isCycleEnd: boolean) => {
  await db
    .update(days)
    .set({ is_cycle_end: isCycleEnd })
    .where(eq(days.date, date));
};

export const updateDayNotes = async (date: string, notes: string | null) => {
  await db
    .update(days)
    .set({ notes: notes ?? null })
    .where(eq(days.date, date));
};

export const insertDay = async (
  date: string,
  flowIntensity: number,
  notes?: string,
  is_cycle_start?: boolean,
  is_cycle_end?: boolean,
) => {
  const day = await getDay(date);
  if (day) {
    await updateDay(
      date,
      flowIntensity,
      notes ?? null,
      is_cycle_start,
      is_cycle_end,
    );
  } else {
    await db.insert(days).values({
      date: date,
      flow_intensity: flowIntensity,
      notes: notes ?? null,
      is_cycle_start: is_cycle_start,
      is_cycle_end: is_cycle_end,
    });
  }
};

export const deleteDay = async (date: string) => {
  await db.delete(days).where(eq(days.date, date));
};

export const deleteAllDays = async () => {
  // delete first day manually to trigger useLiveQuery update in Calendar.tsx
  const firstDay = await db.query.days.findFirst();
  if (!firstDay) return;
  await deleteDay(firstDay.date);
  await db.delete(days);
};
