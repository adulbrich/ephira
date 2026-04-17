import { getDrizzleDatabase } from "@/db/operations/setup";
import { pregnancyAppointments } from "@/db/schema";
import { eq } from "drizzle-orm";

const db = getDrizzleDatabase();

export const getPregnancyAppointmentsForDate = async (date: string) => {
  return db
    .select()
    .from(pregnancyAppointments)
    .where(eq(pregnancyAppointments.date, date));
};

export const getAllPregnancyAppointments = async () => {
  return db
    .select()
    .from(pregnancyAppointments)
    .orderBy(pregnancyAppointments.date);
};

export const insertPregnancyAppointment = async (
  date: string,
  title: string,
  type?: string,
  notes?: string,
) => {
  const result = await db
    .insert(pregnancyAppointments)
    .values({ date, title, type: type ?? null, notes: notes ?? null })
    .returning();
  return result[0];
};

export const deletePregnancyAppointment = async (id: number) => {
  await db
    .delete(pregnancyAppointments)
    .where(eq(pregnancyAppointments.id, id));
};
