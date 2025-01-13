import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"

export const days = sqliteTable("days", {
  id: integer().primaryKey({ autoIncrement: true }),
  date: text().notNull().unique(),
  flow_intensity: integer(),
  is_cycle_start: integer({ mode: "boolean" }).default(false),
  is_cycle_end: integer({ mode: "boolean" }).default(false),
  notes: text(),
})

export const moods = sqliteTable("moods", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  visible: integer({ mode: "boolean" }).default(true),
  description: text(),
})

export const moodEntries = sqliteTable("mood_entries", {
  id: integer().primaryKey({ autoIncrement: true }),
  day_id: integer()
    .notNull()
    .references(() => days.id),
  mood_id: integer()
    .notNull()
    .references(() => moods.id),
  intensity: integer(),
  notes: text(),
})

export const symptoms = sqliteTable("symptoms", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  visible: integer({ mode: "boolean" }).default(true),
  description: text(),
})

export const symptomEntries = sqliteTable("symptom_entries", {
  id: integer().primaryKey({ autoIncrement: true }),
  day_id: integer()
    .notNull()
    .references(() => days.id),
  symptom_id: integer()
    .notNull()
    .references(() => symptoms.id),
  intensity: integer(),
  notes: text(),
})

export const medications = sqliteTable("medications", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  dose: text(),
  visible: integer({ mode: "boolean" }).default(true),
  type: text(), // e.g. "birth control", "pain relief"
  description: text(),
})

export const medicationEntries = sqliteTable("medication_entries", {
  id: integer().primaryKey({ autoIncrement: true }),
  day_id: integer()
    .notNull()
    .references(() => days.id),
  medication_id: integer()
    .notNull()
    .references(() => medications.id),
  time_taken: text(),
  notes: text(),
})

export type Day = typeof days.$inferSelect
export type Mood = typeof moods.$inferSelect
export type MoodEntry = typeof moodEntries.$inferSelect
export type Symptom = typeof symptoms.$inferSelect
export type SymptomEntry = typeof symptomEntries.$inferSelect
export type Medication = typeof medications.$inferSelect
export type MedicationEntry = typeof medicationEntries.$inferSelect
