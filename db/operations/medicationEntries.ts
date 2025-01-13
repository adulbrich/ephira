import { getDrizzleDatabase } from "@/db/operations/setup"
import { medicationEntries } from "@/db/schema"
import { eq, and } from "drizzle-orm"

const db = getDrizzleDatabase()
