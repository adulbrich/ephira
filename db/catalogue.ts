import {
  getAllVisibleMedications,
  getAllVisibleMoods,
  getAllVisibleSymptoms,
} from "@/db/database";

/** The four things settings can add to, hide from, or delete. */
export const CATALOGUE_KINDS = [
  "symptom",
  "mood",
  "medication",
  "birth control",
] as const;

export type CatalogueKind = (typeof CATALOGUE_KINDS)[number];

/**
 * What the user can choose from while logging. See CONTEXT.md, Catalogue.
 *
 * Birth control is separated out because the day view offers it as its own
 * Section, though it is a Medication row like any other.
 */
export type Catalogue = {
  symptoms: string[];
  moods: string[];
  medications: string[];
  birthControl: string[];
};

const BIRTH_CONTROL_TYPE = "birth control";

let cached: Promise<Catalogue> | null = null;
const listeners = new Set<() => void>();

async function read(): Promise<Catalogue> {
  const [symptoms, moods, medications] = await Promise.all([
    getAllVisibleSymptoms(),
    getAllVisibleMoods(),
    getAllVisibleMedications(),
  ]);

  return {
    symptoms: symptoms.map((symptom) => symptom.name),
    moods: moods.map((mood) => mood.name),
    medications: medications
      .filter((medication) => medication.type !== BIRTH_CONTROL_TYPE)
      .map((medication) => medication.name),
    birthControl: medications
      .filter((medication) => medication.type === BIRTH_CONTROL_TYPE)
      .map((medication) => medication.name),
  };
}

/**
 * The Catalogue, read once and held.
 *
 * The Catalogue is edited rarely, in settings, while entries are written
 * constantly, while logging. So this caches, and whoever edits it says so by
 * calling `invalidateCatalogue`. It used to be re-read by each accordion
 * whenever any accordion expanded, which is why settings screens collapsed the
 * day view's accordions to force a refresh, and why adding a custom Mood shut
 * the Section the user was working in.
 */
export function loadCatalogue(): Promise<Catalogue> {
  if (!cached) cached = read();
  return cached;
}

/** Say the Catalogue has changed. The explicit call the old signal implied. */
export function invalidateCatalogue() {
  cached = null;
  for (const listener of listeners) listener();
}

export function onCatalogueInvalidated(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
