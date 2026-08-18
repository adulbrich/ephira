import {
  CATALOGUE_KINDS,
  invalidateCatalogue,
  loadCatalogue,
  onCatalogueInvalidated,
} from "@/db/catalogue";
import { medications, moods, symptoms } from "@/db/schema";
import {
  getTestDatabase,
  resetTestDatabase,
} from "@/__tests__/helpers/testDatabase";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

const seed = () => {
  const db = getTestDatabase();
  db.insert(moods).values({ name: "Calm", visible: true }).run();
  db.insert(moods).values({ name: "Hidden mood", visible: false }).run();
  db.insert(symptoms).values({ name: "Cramps", visible: true }).run();
  db.insert(medications)
    .values({ name: "Ibuprofen", visible: true, type: null })
    .run();
  db.insert(medications)
    .values({ name: "Pill", visible: true, type: "birth control" })
    .run();
  db.insert(medications)
    .values({ name: "Hidden pill", visible: false, type: "birth control" })
    .run();
};

beforeEach(() => {
  resetTestDatabase();
  invalidateCatalogue();
});

describe("loadCatalogue", () => {
  it("returns what the user can choose from", async () => {
    seed();

    const catalogue = await loadCatalogue();

    expect(catalogue.moods).toEqual(["Calm"]);
    expect(catalogue.symptoms).toEqual(["Cramps"]);
  });

  it("leaves out anything the user has hidden", async () => {
    seed();

    const catalogue = await loadCatalogue();

    expect(catalogue.moods).not.toContain("Hidden mood");
    expect(catalogue.birthControl).not.toContain("Hidden pill");
  });

  it("separates birth control from the other medications", async () => {
    seed();

    const catalogue = await loadCatalogue();

    expect(catalogue.medications).toEqual(["Ibuprofen"]);
    expect(catalogue.birthControl).toEqual(["Pill"]);
  });

  it("is empty rather than absent when nothing is catalogued", async () => {
    const catalogue = await loadCatalogue();

    expect(catalogue).toEqual({
      symptoms: [],
      moods: [],
      medications: [],
      birthControl: [],
    });
  });

  it("reads the database once for repeated loads", async () => {
    seed();

    const first = await loadCatalogue();
    getTestDatabase().insert(moods).values({ name: "Excited" }).run();
    const second = await loadCatalogue();

    // Not stale by accident: the Catalogue is edited rarely, in settings, and
    // whoever edits it says so. That is what invalidateCatalogue is for.
    expect(second).toBe(first);
  });

  it("re-reads after an explicit invalidation", async () => {
    seed();
    await loadCatalogue();

    getTestDatabase().insert(moods).values({ name: "Excited" }).run();
    invalidateCatalogue();

    expect((await loadCatalogue()).moods).toContain("Excited");
  });
});

describe("onCatalogueInvalidated", () => {
  it("tells subscribers when the catalogue changes", async () => {
    const told = jest.fn();
    const unsubscribe = onCatalogueInvalidated(told);

    invalidateCatalogue();

    expect(told).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("stops telling them once they unsubscribe", () => {
    const told = jest.fn();
    onCatalogueInvalidated(told)();

    invalidateCatalogue();

    expect(told).not.toHaveBeenCalled();
  });
});

describe("CATALOGUE_KINDS", () => {
  it("names the four things settings can edit", () => {
    expect([...CATALOGUE_KINDS]).toEqual([
      "symptom",
      "mood",
      "medication",
      "birth control",
    ]);
  });
});
