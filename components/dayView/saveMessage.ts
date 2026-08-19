import {
  birthControlIn,
  medicationsExcludingBirthControl,
  type LoggedDay,
} from "@/db/loggedDay";

/**
 * Which Section a save should be attributed to, as a label for the
 * "<Section> Saved!" message.
 *
 * Extracted from the switch inside DayView's onSave so that the agreement
 * between what the accordions send and what this reads is testable. It was not
 * testable before, and three of the seven cases had never fired: the
 * accordions send "symptoms", "medications" and "notes" while the switch
 * matched "symptom", "medication" and "note". Those saves fell through to the
 * fixed-priority fallback, which can name a Section the user did not touch.
 *
 * The section strings are still bare strings here, which is the underlying
 * weakness. #184 replaces them with a Section enumeration so the disagreement
 * stops compiling rather than being caught by this test.
 */
const sameNames = (a: string[], b: string[]) =>
  JSON.stringify(a) === JSON.stringify(b);

export function savedSectionLabel(
  expandedSection: string | null,
  current: LoggedDay,
  lastSaved: LoggedDay | null,
): string | null {
  const currentMedications = medicationsExcludingBirthControl(current);
  const currentBirthControl = birthControlIn(current)?.name ?? null;

  switch (expandedSection) {
    case "flow":
      return current.flow !== 0 ? "Flow" : null;
    case "symptoms":
      return current.symptoms.length > 0 ? "Symptoms" : null;
    case "mood":
      return current.moods.length > 0 ? "Moods" : null;
    case "medications":
      return currentMedications.length > 0 ? "Medications" : null;
    case "birthControl":
      return currentBirthControl ? "Birth Control" : null;
    case "notes":
      return current.notes.trim() !== "" ? "Notes" : null;
    case "intercourse":
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
