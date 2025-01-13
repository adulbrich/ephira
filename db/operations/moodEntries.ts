import { getDrizzleDatabase } from "@/db/operations/setup"
import { moodEntries, moods, days } from "@/db/schema"
import { eq } from "drizzle-orm"

const db = getDrizzleDatabase()
