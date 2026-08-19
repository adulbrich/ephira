import { relations } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  value: text(),
});

export const days = sqliteTable("days", {
  id: integer().primaryKey({ autoIncrement: true }),
  date: text().notNull().unique(),
  flow_intensity: integer(),
  is_cycle_start: integer({ mode: "boolean" }).default(false),
  is_cycle_end: integer({ mode: "boolean" }).default(false),
  intercourse: integer({ mode: "boolean" }).default(false),
  notes: text(),
});

export const moods = sqliteTable("moods", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  visible: integer({ mode: "boolean" }).default(true),
  description: text(),
});

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
});

export const symptoms = sqliteTable("symptoms", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  visible: integer({ mode: "boolean" }).default(true),
  description: text(),
});

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
});

export const medications = sqliteTable("medications", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  dose: text(),
  visible: integer({ mode: "boolean" }).default(true),
  type: text(), // e.g. "birth control", "pain relief"
  description: text(),
});

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
});

// to track when prediction were made
export const predictionSnapshots = sqliteTable(
  "prediction_snapshots",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    prediction_made_date: text().notNull(),
    predicted_date: text().notNull(),
    confidence: integer().notNull(),
    actual_had_flow: integer({ mode: "boolean" }),
    checked_date: text(),
  },
  (table) => [
    // A Prediction Snapshot is identified by when it was made and what it
    // predicted. Deliberately not predicted_date alone: the table is a time
    // series, and the accuracy check depends on knowing what was predicted
    // before the outcome was known.
    uniqueIndex("prediction_snapshots_generation_unique").on(
      table.prediction_made_date,
      table.predicted_date,
    ),
  ],
);

export const pregnancyDays = sqliteTable("pregnancy_days", {
  id: integer().primaryKey({ autoIncrement: true }),
  date: text().notNull().unique(),
  kicks: integer(),
  symptoms: text(), // JSON array of symptom name strings
  moods: text(), // JSON array of mood name strings
  notes: text(),
});

export const pregnancyAppointments = sqliteTable("pregnancy_appointments", {
  id: integer().primaryKey({ autoIncrement: true }),
  date: text().notNull(),
  title: text().notNull(),
  type: text(), // "OB Visit", "Ultrasound", "Lab Work", "Other"
  notes: text(),
});

/**
 * The foreign keys above say a column points somewhere. These say what the
 * shape of the data is, which is what `db.query.…({ with })` needs in order to
 * load a Day and its entries in one statement instead of four.
 *
 * Declared here rather than beside each query because both drizzle handles —
 * `db/operations/setup.ts` on device and `__tests__/helpers/testDatabase.ts`
 * under jest — build themselves from `import * as schema`. Exporting them from
 * this module is what makes the two agree without either knowing about the
 * other.
 *
 * Note what these do NOT do: the app ships no `PRAGMA foreign_keys`, so on
 * device the constraints are off and an entry can outlive the catalogue row it
 * names. A relation is a description, not an enforcement. Readers have to cope
 * with the `one(...)` side being absent.
 */
export const daysRelations = relations(days, ({ many }) => ({
  moodEntries: many(moodEntries),
  symptomEntries: many(symptomEntries),
  medicationEntries: many(medicationEntries),
}));

export const moodEntriesRelations = relations(moodEntries, ({ one }) => ({
  day: one(days, { fields: [moodEntries.day_id], references: [days.id] }),
  mood: one(moods, { fields: [moodEntries.mood_id], references: [moods.id] }),
}));

export const symptomEntriesRelations = relations(symptomEntries, ({ one }) => ({
  day: one(days, { fields: [symptomEntries.day_id], references: [days.id] }),
  symptom: one(symptoms, {
    fields: [symptomEntries.symptom_id],
    references: [symptoms.id],
  }),
}));

export const medicationEntriesRelations = relations(
  medicationEntries,
  ({ one }) => ({
    day: one(days, {
      fields: [medicationEntries.day_id],
      references: [days.id],
    }),
    medication: one(medications, {
      fields: [medicationEntries.medication_id],
      references: [medications.id],
    }),
  }),
);

export const moodsRelations = relations(moods, ({ many }) => ({
  entries: many(moodEntries),
}));

export const symptomsRelations = relations(symptoms, ({ many }) => ({
  entries: many(symptomEntries),
}));

export const medicationsRelations = relations(medications, ({ many }) => ({
  entries: many(medicationEntries),
}));

export type Settings = typeof settings.$inferSelect;
export type Day = typeof days.$inferSelect;
export type Mood = typeof moods.$inferSelect;
export type MoodEntry = typeof moodEntries.$inferSelect;
export type Symptom = typeof symptoms.$inferSelect;
export type SymptomEntry = typeof symptomEntries.$inferSelect;
export type Medication = typeof medications.$inferSelect;
export type MedicationEntry = typeof medicationEntries.$inferSelect;
export type PredictionSnapshot = typeof predictionSnapshots.$inferSelect;
export type PregnancyDay = typeof pregnancyDays.$inferSelect;
export type PregnancyAppointment = typeof pregnancyAppointments.$inferSelect;
