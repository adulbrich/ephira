import { savedSectionLabel } from "@/components/dayView/saveMessage";
import { emptyLoggedDay, type LoggedDay } from "@/db/loggedDay";
import { Section } from "@/constants/Sections";

// This decision touches no database. The stub says so: db/loggedDay.ts opens a
// handle when it loads, and nothing here ever reaches it.
jest.mock("@/db/operations/setup", () => ({
  getDatabase: jest.fn(),
  getDrizzleDatabase: jest.fn(),
}));

/**
 * Both sides now name the same enumeration, so the drift this test was written
 * to catch cannot compile. What is left worth checking is the mapping from a
 * Section to its label, and the fallback when no Section is expanded.
 */
const SECTION_FROM_ACCORDION = {
  flow: Section.Flow,
  symptoms: Section.Symptoms,
  moods: Section.Moods,
  medications: Section.Medications,
  birthControl: Section.BirthControl,
  intercourse: Section.Intercourse,
  notes: Section.Notes,
};

const empty: LoggedDay = emptyLoggedDay("2026-04-01");

const filled: LoggedDay = {
  ...empty,
  flow: 3,
  notes: "slept badly",
  symptoms: ["Cramps"],
  moods: ["Calm"],
  medications: [{ name: "Ibuprofen" }, { name: "Pill" }],
  intercourse: true,
};

describe("savedSectionLabel, with a section expanded", () => {
  it.each([
    [SECTION_FROM_ACCORDION.flow, "Flow"],
    [SECTION_FROM_ACCORDION.symptoms, "Symptoms"],
    [SECTION_FROM_ACCORDION.moods, "Moods"],
    [SECTION_FROM_ACCORDION.medications, "Medications"],
    [SECTION_FROM_ACCORDION.birthControl, "Birth Control"],
    [SECTION_FROM_ACCORDION.intercourse, "Intercourse"],
    [SECTION_FROM_ACCORDION.notes, "Notes"],
  ])("names %s as %s", (section, label) => {
    expect(savedSectionLabel(section, filled, null)).toBe(label);
  });

  it.each([
    [SECTION_FROM_ACCORDION.flow],
    [SECTION_FROM_ACCORDION.symptoms],
    [SECTION_FROM_ACCORDION.moods],
    [SECTION_FROM_ACCORDION.medications],
    [SECTION_FROM_ACCORDION.birthControl],
    [SECTION_FROM_ACCORDION.notes],
  ])("says nothing for %s when that section is empty", (section) => {
    expect(savedSectionLabel(section, empty, null)).toBeNull();
  });

  it("reports intercourse even when it is being turned off", () => {
    // Unlike the others, absence is itself a value the user chose.
    expect(
      savedSectionLabel(SECTION_FROM_ACCORDION.intercourse, empty, null),
    ).toBe("Intercourse");
  });

  it("never attributes a save to a section other than the expanded one", () => {
    // The defect: "symptoms" was a dead case, so this fell through to the
    // fixed-priority fallback and announced "Flow Saved!" while the user was
    // editing symptoms.
    const lastSaved: LoggedDay = { ...filled, flow: 1, symptoms: [] };

    expect(
      savedSectionLabel(SECTION_FROM_ACCORDION.symptoms, filled, lastSaved),
    ).toBe("Symptoms");
  });
});

describe("savedSectionLabel, with no section expanded", () => {
  it("falls back to whatever differs from the last save", () => {
    expect(
      savedSectionLabel(null, filled, { ...filled, moods: ["Anxious"] }),
    ).toBe("Moods");
  });

  it("says nothing when there is no last save to compare against", () => {
    expect(savedSectionLabel(null, filled, null)).toBeNull();
  });

  it("says nothing when nothing changed", () => {
    expect(savedSectionLabel(null, filled, filled)).toBeNull();
  });

  it("keeps its fixed priority order when several things changed", () => {
    expect(
      savedSectionLabel(null, filled, {
        ...filled,
        flow: 1,
        notes: "different",
      }),
    ).toBe("Flow");
  });
});
