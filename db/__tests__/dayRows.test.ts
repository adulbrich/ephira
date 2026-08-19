import { daysFromJoinedRows, type JoinedDayRow } from "@/db/dayRows";
import type { Day } from "@/db/schema";

const day = (overrides: Partial<Day> = {}): Day => ({
  id: 1,
  date: "2026-04-01",
  flow_intensity: 2,
  is_cycle_start: false,
  is_cycle_end: false,
  intercourse: false,
  notes: null,
  ...overrides,
});

const named = (id: number, name: string) => ({ day_id: 1, id, name });

const row = (overrides: Partial<JoinedDayRow> = {}): JoinedDayRow => ({
  days: day(),
  moodQuery: null,
  symptomQuery: null,
  medicationQuery: null,
  ...overrides,
});

describe("daysFromJoinedRows", () => {
  it("returns nothing for no rows", () => {
    expect(daysFromJoinedRows([])).toEqual([]);
  });

  it("keeps the day's own fields", () => {
    const [result] = daysFromJoinedRows([
      row({
        days: day({ flow_intensity: 3, notes: "heavy", intercourse: true }),
      }),
    ]);

    expect(result).toMatchObject({
      id: 1,
      date: "2026-04-01",
      flow_intensity: 3,
      notes: "heavy",
      intercourse: true,
    });
  });

  it("gives a day with no entries three empty arrays", () => {
    expect(daysFromJoinedRows([row()])).toEqual([
      { ...day(), moods: [], symptoms: [], medications: [] },
    ]);
  });

  it("collapses the cross product three left joins produce", () => {
    // Two moods and three symptoms on one day come back from SQL as six rows,
    // every mood paired with every symptom. The whole reason this function
    // exists is that six rows are one day with two moods and three symptoms,
    // not one day with six of each.
    const moods = [named(1, "Calm"), named(2, "Sad")];
    const symptoms = [named(1, "Cramps"), named(2, "Nausea"), named(3, "Aura")];

    const rows = moods.flatMap((moodQuery) =>
      symptoms.map((symptomQuery) => row({ moodQuery, symptomQuery })),
    );
    expect(rows).toHaveLength(6);

    const [result] = daysFromJoinedRows(rows);

    expect(result.moods).toEqual(["Calm", "Sad"]);
    expect(result.symptoms).toEqual(["Cramps", "Nausea", "Aura"]);
  });

  it("collapses two catalogue rows sharing a name", () => {
    // `medications.name` has no unique constraint, unlike `moods.name` and
    // `symptoms.name`. Two distinct Medication rows can be called the same
    // thing, and this dedupes by name, so the day shows one. Pinning the
    // behaviour rather than endorsing it.
    const [result] = daysFromJoinedRows([
      row({ medicationQuery: named(1, "Pill") }),
      row({ medicationQuery: named(2, "Pill") }),
    ]);

    expect(result.medications).toEqual(["Pill"]);
  });

  it("keeps separate days separate", () => {
    const second = day({ id: 2, date: "2026-04-02" });

    const result = daysFromJoinedRows([
      row({ moodQuery: named(1, "Calm") }),
      row({ days: second, moodQuery: { day_id: 2, id: 2, name: "Sad" } }),
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].moods).toEqual(["Calm"]);
    expect(result[1].moods).toEqual(["Sad"]);
  });
});
