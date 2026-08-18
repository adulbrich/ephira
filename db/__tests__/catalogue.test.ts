import {
  addCatalogueItem,
  CATALOGUE_KINDS,
  invalidateCatalogue,
  loadCatalogue,
  onCatalogueInvalidated,
  removeCatalogueItem,
  setCatalogueItemVisible,
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

describe("editing the catalogue", () => {
  it("adds an item of each kind, visible", async () => {
    for (const kind of CATALOGUE_KINDS) {
      await addCatalogueItem(kind, `New ${kind}`);
    }

    const catalogue = await loadCatalogue();

    expect(catalogue.symptoms).toContain("New symptom");
    expect(catalogue.moods).toContain("New mood");
    expect(catalogue.medications).toContain("New medication");
    expect(catalogue.birthControl).toContain("New birth control");
  });

  it("knows a birth control is a medication with a type", async () => {
    await addCatalogueItem("birth control", "Patch");

    const catalogue = await loadCatalogue();

    expect(catalogue.birthControl).toContain("Patch");
    expect(catalogue.medications).not.toContain("Patch");
  });

  it("removes an item", async () => {
    await addCatalogueItem("mood", "Restless");
    await removeCatalogueItem("mood", "Restless");

    expect((await loadCatalogue()).moods).not.toContain("Restless");
  });

  it("hides an item without deleting it", async () => {
    await addCatalogueItem("symptom", "Aura");
    await setCatalogueItemVisible("symptom", "Aura", false);

    expect((await loadCatalogue()).symptoms).not.toContain("Aura");

    await setCatalogueItemVisible("symptom", "Aura", true);

    expect((await loadCatalogue()).symptoms).toContain("Aura");
  });

  it("invalidates as it writes, so readers do not go stale", async () => {
    await loadCatalogue();
    await addCatalogueItem("mood", "Restless");

    expect((await loadCatalogue()).moods).toContain("Restless");
  });

  it("keeps a hidden birth control out of the medications list too", async () => {
    await addCatalogueItem("birth control", "Patch");
    await setCatalogueItemVisible("birth control", "Patch", false);

    const catalogue = await loadCatalogue();

    expect(catalogue.birthControl).not.toContain("Patch");
    expect(catalogue.medications).not.toContain("Patch");
  });
});
