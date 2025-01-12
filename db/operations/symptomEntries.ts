import { getDrizzleDatabase } from "@/db/operations/setup"
import { symptomEntries } from "@/db/schema"
import { eq } from "drizzle-orm"

const db = getDrizzleDatabase()
