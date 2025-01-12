import { int, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const days = sqliteTable("days", {
  id: int().primaryKey({ autoIncrement: true }),
  date: text().notNull(),
  flow_intensity: int(),
})

export type Day = typeof days.$inferSelect
