import {
  CATALOGUE_SECTIONS,
  visibleSelection,
} from "@/components/dayView/CatalogueAccordion";
import { CATALOGUE_KINDS } from "@/db/catalogue";
import { Section } from "@/constants/Sections";

// The accordion imports CustomEntries, which reaches the database on load.
// Nothing under test here does.
jest.mock("@/db/operations/setup", () => ({
  getDatabase: jest.fn(),
  getDrizzleDatabase: jest.fn(),
}));

describe("visibleSelection", () => {
  it("counts what the user selected and can still see", () => {
    expect(visibleSelection(["Calm", "Sad"], ["Calm"])).toEqual(["Calm"]);
  });

  it("leaves out a selection whose catalogue item has been hidden", () => {
    // Hiding a Mood in settings does not unselect it on days already logged.
    // Counting it would show a number the chips below do not account for.
    expect(visibleSelection(["Calm"], ["Calm", "Hidden"])).toEqual(["Calm"]);
  });

  it("is empty when nothing is selected", () => {
    expect(visibleSelection(["Calm"], [])).toEqual([]);
  });

  it("is empty when the catalogue is empty", () => {
    expect(visibleSelection([], ["Calm"])).toEqual([]);
  });
});

describe("CATALOGUE_SECTIONS", () => {
  it("covers exactly the sections that are a choice from a catalogue", () => {
    expect(Object.keys(CATALOGUE_SECTIONS).sort()).toEqual(
      [Section.Symptoms, Section.Moods, Section.Medications].sort(),
    );
  });

  it("names a real catalogue kind for each", () => {
    for (const presentation of Object.values(CATALOGUE_SECTIONS)) {
      expect(CATALOGUE_KINDS).toContain(presentation.kind);
    }
  });

  it("gives each section its own title and icon", () => {
    const titles = Object.values(CATALOGUE_SECTIONS).map((p) => p.title);
    const icons = Object.values(CATALOGUE_SECTIONS).map((p) => p.icon);

    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(icons).size).toBe(icons.length);
  });
});
