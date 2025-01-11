import { eq } from "drizzle-orm"
import { days } from "@/db/schema"
import { getDrizzleDatabase } from "@/db/operations/setup"

const db = getDrizzleDatabase()

export const getDay = async (date: string) => {
  const day = await db.query.days.findFirst({
    where: eq(days.date, date),
  })
  return day
}

export const getAllDays = async () => {
  const allDays = await db.select().from(days)
  return allDays
}

export const updateDay = async (date: string, flowIntensity: number) => {
  await db
    .update(days)
    .set({ flow_intensity: flowIntensity })
    .where(eq(days.date, date))
}

export const insertDay = async (date: string, flowIntensity: number) => {
  // first check if the day already exists
  const day = await getDay(date)
  if (day) {
    await updateDay(date, flowIntensity)
  } else {
    await db.insert(days).values({ date: date, flow_intensity: flowIntensity })
  }
}

export const deleteDay = async (date: string) => {
  await db.delete(days).where(eq(days.date, date))
}

export const deleteAllDays = async () => {
  await db.delete(days)
}
