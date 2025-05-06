import { getDrizzleDatabase } from "@/db/operations/setup";
import { days } from "@/db/schema";
import { eq } from "drizzle-orm";

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
) => {
  await db
    .update(days)
    .set({ flow_intensity: flowIntensity, notes: notes ?? null })
    .where(eq(days.date, date));
};

export const updateDayFlow = async (date: string, flowIntensity: number) => {
  await db
    .update(days)
    .set({ flow_intensity: flowIntensity })
    .where(eq(days.date, date));
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
  await db.update(days).set({ notes: notes ?? null }).where(eq(days.date, date));
};

export const insertDay = async (
  date: string,
  flowIntensity: number,
  notes?: string,
) => {
  const day = await getDay(date);
  if (day) {
    await updateDay(date, flowIntensity, notes ?? null);
  } else {
    await db
      .insert(days)
      .values({ date: date, flow_intensity: flowIntensity, notes: notes ?? null });
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
