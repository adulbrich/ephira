import {
  birthControlIn,
  medicationsExcludingBirthControl,
  type LoggedDay,
} from "@/db/loggedDay";
import { Section } from "@/constants/Sections";

/**
 * Which Section a save should be attributed to, as a label for the
 * "<Section> Saved!" message.
 *
 * Three of the seven cases here used to be dead: the accordions said
 * "symptoms", "medications" and "notes" while this switch said "symptom",
 * "medication" and "note", and both sides typechecked because the contract was
 * `string | null`. Those saves fell through to the fixed-priority fallback,
 * which can name a Section the user did not touch.
 *
 * Both sides now name the same `Section`, so that disagreement no longer
 * compiles.
 */
const sameNames = (a: string[], b: string[]) =>
  JSON.stringify(a) === JSON.stringify(b);

export function savedSectionLabel(
  expandedSection: Section | null,
  current: LoggedDay,
  lastSaved: LoggedDay | null,
): string | null {
  const currentMedications = medicationsExcludingBirthControl(current);
  const currentBirthControl = birthControlIn(current)?.name ?? null;

  switch (expandedSection) {
    case Section.Flow:
      return current.flow !== 0 ? "Flow" : null;
    case Section.Symptoms:
      return current.symptoms.length > 0 ? "Symptoms" : null;
    case Section.Moods:
      return current.moods.length > 0 ? "Moods" : null;
    case Section.Medications:
      return currentMedications.length > 0 ? "Medications" : null;
    case Section.BirthControl:
      return currentBirthControl ? "Birth Control" : null;
    case Section.Notes:
      return current.notes.trim() !== "" ? "Notes" : null;
    case Section.Intercourse:
      // Absence is itself a value the user chose here, so unlike the others
      // there is no "empty" case to stay quiet about.
      return "Intercourse";
  }

  if (!lastSaved) return null;

  // No Section expanded, so fall back to whatever differs, in a fixed order.
  if (current.flow !== lastSaved.flow) return "Flow";
  if (current.notes !== lastSaved.notes) return "Notes";
  if (!sameNames(current.symptoms, lastSaved.symptoms)) return "Symptoms";
  if (!sameNames(current.moods, lastSaved.moods)) return "Moods";
  if (
    !sameNames(currentMedications, medicationsExcludingBirthControl(lastSaved))
  )
    return "Medications";
  if (currentBirthControl !== (birthControlIn(lastSaved)?.name ?? null))
    return "Birth Control";
  if (current.intercourse !== lastSaved.intercourse) return "Intercourse";

  return null;
}
