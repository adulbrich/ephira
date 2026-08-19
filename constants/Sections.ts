/**
 * Every Section of a Logged Day, in either tracking mode.
 *
 * Sections are a property of what can be logged, not of which mode is active;
 * each mode renders its own subset. See CONTEXT.md, Section.
 *
 * These strings were previously written as bare literals on both sides of a
 * `state: string | null` contract, which is how three cases of DayView's
 * save-message switch came to be dead: the accordions said "symptoms" and the
 * switch said "symptom". Naming them once means that stops compiling.
 */

// the type of a Section are the same thing; naming them apart would mean
// writing SectionId at every use site.
export const Section = {
  Flow: "flow",
  Moods: "moods",
  Symptoms: "symptoms",
  Medications: "medications",
  BirthControl: "birthControl",
  Intercourse: "intercourse",
  Notes: "notes",
  Kicks: "kicks",
  Appointments: "appointments",
} as const;

// The value and the type of a Section are the same thing; naming them apart
// would mean writing SectionId at every use site.
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Section = (typeof Section)[keyof typeof Section];

/** The Sections cycle mode renders, in the order the day view shows them. */
export const CYCLE_SECTIONS: readonly Section[] = [
  Section.Flow,
  Section.BirthControl,
  Section.Intercourse,
  Section.Symptoms,
  Section.Moods,
  Section.Medications,
  Section.Notes,
];

/** The Sections pregnancy mode renders. */
export const PREGNANCY_SECTIONS: readonly Section[] = [
  Section.Kicks,
  Section.Symptoms,
  Section.Moods,
  Section.Medications,
  Section.Notes,
  Section.Appointments,
];
