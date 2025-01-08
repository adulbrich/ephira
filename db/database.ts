import * as SQLite from "expo-sqlite"
import { drizzle, ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite"
import { eq } from "drizzle-orm"
import { days } from "./schema"
import * as schema from "./schema"

const DATABASE_NAME = "test.db"

let expoDb = SQLite.openDatabaseSync(DATABASE_NAME)
let db = drizzle(expoDb, { schema })

function log(message: any) {
  console.log("\n### Database message:\n", message)
  console.log("\n")
}

export const getDatabase = () => {
  if (!expoDb || !db) {
    expoDb = SQLite.openDatabaseSync(DATABASE_NAME)
    db = drizzle(expoDb, { schema })
  }
  return db
}

export const getDay = async (date: string) => {
  const day = await db.select().from(days).where(eq(days.date, date))
  return day[0]
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
