import {
  deleteMedication,
  deleteMood,
  deleteSymptom,
  getAllVisibleMedications,
  getAllVisibleMoods,
  getAllVisibleSymptoms,
  insertMedication,
  insertMood,
  insertSymptom,
  updateMedication,
  updateMood,
  updateSymptom,
} from "@/db/database";

/** The four things settings can add to, hide from, or delete. */
export const CATALOGUE_KINDS = [
  "symptom",
  "mood",
  "medication",
  "birth control",
] as const;

export type CatalogueKind = (typeof CATALOGUE_KINDS)[number];

/** What each kind is called in settings, where all four are shown at once. */
export const CATALOGUE_KIND_TITLES: Record<CatalogueKind, string> = {
  symptom: "Symptoms",
  mood: "Moods",
  medication: "Medications",
  "birth control": "Birth Control",
};

/** One list per kind. What a settings screen holds while it is open. */
export type CatalogueLists<Item> = Record<CatalogueKind, Item[]>;

export const emptyCatalogueLists = <Item>(): CatalogueLists<Item> => ({
  symptom: [],
  mood: [],
  medication: [],
  "birth control": [],
});

/**
 * Whether a name is already in use, the way a user would judge it.
 *
 * Spacing, underscores and capitalisation are not differences: "Hot flashes",
 * "hot_flashes" and "HOTFLASHES" are one thing to whoever typed them, and the
 * accordions would show them as three indistinguishable rows.
 *
 * `existing` is every name across all four kinds, not just the one being added
 * to. The kinds are four lists on screen and one namespace to the user.
 */
export function catalogueNameTaken(name: string, existing: string[]): boolean {
  const squash = (value: string) => value.replace(/[_\s]/g, "").toLowerCase();
  const squashed = squash(name);
  return existing.some((other) => squash(other) === squashed);
}

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

/**
 * Which table a Catalogue kind means, in one place.
 *
 * Both settings screens carried their own four-way switch over these strings.
 * The switches did different things, but they encoded the same knowledge:
 * that a medication and a birth control are the same table distinguished by
 * `type`, and that the other two are tables of their own.
 */
const WRITERS: Record<
  CatalogueKind,
  {
    add: (name: string) => Promise<void>;
    remove: (name: string) => Promise<void>;
    setVisible: (name: string, visible: boolean) => Promise<void>;
  }
> = {
  symptom: {
    add: async (name) => {
      await insertSymptom(name, true);
    },
    remove: async (name) => {
      await deleteSymptom(name);
    },
    setVisible: async (name, visible) => {
      await updateSymptom(name, visible);
    },
  },
  mood: {
    add: async (name) => {
      await insertMood(name, true);
    },
    remove: async (name) => {
      await deleteMood(name);
    },
    setVisible: async (name, visible) => {
      await updateMood(name, visible);
    },
  },
  medication: {
    add: async (name) => {
      await insertMedication(name, true, "medication");
    },
    remove: async (name) => {
      await deleteMedication(name);
    },
    setVisible: async (name, visible) => {
      await updateMedication(name, visible, "medication");
    },
  },
  "birth control": {
    add: async (name) => {
      await insertMedication(name, true, BIRTH_CONTROL_TYPE);
    },
    remove: async (name) => {
      await deleteMedication(name);
    },
    setVisible: async (name, visible) => {
      await updateMedication(name, visible, BIRTH_CONTROL_TYPE);
    },
  },
};

export async function addCatalogueItem(kind: CatalogueKind, name: string) {
  await WRITERS[kind].add(name);
  invalidateCatalogue();
}

export async function removeCatalogueItem(kind: CatalogueKind, name: string) {
  await WRITERS[kind].remove(name);
  invalidateCatalogue();
}

export async function setCatalogueItemVisible(
  kind: CatalogueKind,
  name: string,
  visible: boolean,
) {
  await WRITERS[kind].setVisible(name, visible);
  invalidateCatalogue();
}
