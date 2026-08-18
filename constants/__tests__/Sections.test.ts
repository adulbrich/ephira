import {
  CYCLE_SECTIONS,
  PREGNANCY_SECTIONS,
  Section,
} from "@/constants/Sections";

describe("Sections", () => {
  it("names every section exactly once", () => {
    const values = Object.values(Section);

    expect(new Set(values).size).toBe(values.length);
  });

  it("gives each mode a subset of the same enumeration", () => {
    for (const section of [...CYCLE_SECTIONS, ...PREGNANCY_SECTIONS]) {
      expect(Object.values(Section)).toContain(section);
    }
  });

  it("does not repeat a section within a mode", () => {
    expect(new Set(CYCLE_SECTIONS).size).toBe(CYCLE_SECTIONS.length);
    expect(new Set(PREGNANCY_SECTIONS).size).toBe(PREGNANCY_SECTIONS.length);
  });

  it("shares the sections both modes log", () => {
    const shared = CYCLE_SECTIONS.filter((section) =>
      PREGNANCY_SECTIONS.includes(section),
    );

    expect(shared).toEqual([
      Section.Symptoms,
      Section.Moods,
      Section.Medications,
      Section.Notes,
    ]);
  });

  it("keeps flow and the cycle markers out of pregnancy mode", () => {
    // Pregnancy has nothing to predict and no flow to log. ADR 0001.
    expect(PREGNANCY_SECTIONS).not.toContain(Section.Flow);
    expect(PREGNANCY_SECTIONS).not.toContain(Section.BirthControl);
  });
});
