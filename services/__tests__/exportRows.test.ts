import {
  birthControlDetail,
  csvField,
  groupEntriesByMonth,
  toCsv,
} from "@/services/exportRows";
import type { ExportData, ExportDayEntry } from "@/constants/Interfaces";

const entry = (
  date: string,
  overrides: Partial<ExportDayEntry> = {},
): ExportDayEntry => ({
  date,
  flow_intensity: 0,
  notes: "",
  moods: [],
  symptoms: [],
  medications: [],
  birth_control: [],
  ...overrides,
});

const headers: ExportData["headers"] = {
  base_header: ["date", "flow_intensity", "notes"],
  symptoms: ["Cramps"],
  moods: ["Happy"],
  medications: ["Ibuprofen"],
  birth_control: ["Pill"],
};

describe("csvField", () => {
  it("quotes a plain value", () => {
    expect(csvField("cramping")).toBe('"cramping"');
  });

  it("escapes an embedded quote by doubling it", () => {
    // The rule was `"${value}"` with no escaping, so a note containing a quote
    // ended its field early and shifted every column after it on that row.
    expect(csvField('she said "ok", then left')).toBe(
      '"she said ""ok"", then left"',
    );
  });

  it("keeps a comma inside the field", () => {
    expect(csvField("one, two")).toBe('"one, two"');
  });

  it("keeps a newline inside the field", () => {
    expect(csvField("line one\nline two")).toBe('"line one\nline two"');
  });

  it("renders an absent value as an empty field", () => {
    expect(csvField(undefined)).toBe('""');
    expect(csvField("")).toBe('""');
  });
});

describe("birthControlDetail", () => {
  it("gives the time when only a time is recorded", () => {
    expect(birthControlDetail({ name: "Pill", time_taken: "08:00" })).toBe(
      "Time: 08:00",
    );
  });

  it("gives the notes when only notes are recorded", () => {
    expect(birthControlDetail({ name: "Pill", notes: "with food" })).toBe(
      "Notes: with food",
    );
  });

  it("joins both with a comma", () => {
    expect(
      birthControlDetail({
        name: "Pill",
        time_taken: "08:00",
        notes: "with food",
      }),
    ).toBe("Time: 08:00, Notes: with food");
  });

  it("is empty when neither is recorded", () => {
    expect(birthControlDetail({ name: "Pill" })).toBe("");
  });
});

describe("toCsv", () => {
  it("writes a header row from the Catalogue names", () => {
    const [header] = toCsv({ headers, dailyData: {} }).split("\n");

    expect(header).toBe(
      "date,flow_intensity,notes,symptom.Cramps,mood.Happy,medication.Ibuprofen,birth_control.Pill,birth_control.Pill.notes",
    );
  });

  it("marks what was logged and leaves the rest blank", () => {
    const csv = toCsv({
      headers,
      dailyData: {
        "2026-08-01": entry("2026-08-01", {
          flow_intensity: 3,
          symptoms: ["Cramps"],
          medications: [{ name: "Ibuprofen" }],
        }),
      },
    });
    const row = csv.split("\n")[1].split(",");

    expect(row[1]).toBe("3");
    expect(row[3]).toBe("x"); // symptom.Cramps
    expect(row[4]).toBe(""); // mood.Happy
    expect(row[5]).toBe("x"); // medication.Ibuprofen
    expect(row[6]).toBe(""); // birth_control.Pill
  });

  it("survives a note containing a quote and a comma", () => {
    // Before escaping, this row gained columns and the file no longer parsed.
    const csv = toCsv({
      headers,
      dailyData: {
        "2026-08-01": entry("2026-08-01", { notes: 'said "ok", then left' }),
      },
    });
    const row = csv.split("\n")[1];

    expect(row).toContain('"said ""ok"", then left"');
    expect(csv.split("\n")[0].split(",")).toHaveLength(8);
  });

  it("puts the birth control detail in its own field", () => {
    const csv = toCsv({
      headers,
      dailyData: {
        "2026-08-01": entry("2026-08-01", {
          birth_control: [
            { name: "Pill", time_taken: "08:00", notes: "with food" },
          ],
        }),
      },
    });

    expect(csv.split("\n")[1]).toContain('"Time: 08:00, Notes: with food"');
  });
});

describe("groupEntriesByMonth", () => {
  it("groups by calendar month, newest month first", () => {
    const groups = groupEntriesByMonth([
      entry("2026-03-04"),
      entry("2026-08-15"),
      entry("2026-05-20"),
    ]);

    expect(groups.map((g) => g.key)).toEqual(["2026-08", "2026-05", "2026-03"]);
  });

  it("orders the days within a month oldest first", () => {
    const groups = groupEntriesByMonth([
      entry("2026-08-31"),
      entry("2026-08-01"),
      entry("2026-08-15"),
    ]);

    expect(groups[0].entries.map((e) => e.date)).toEqual([
      "2026-08-01",
      "2026-08-15",
      "2026-08-31",
    ]);
  });

  it("does not confuse the same month in different years", () => {
    const groups = groupEntriesByMonth([
      entry("2025-08-01"),
      entry("2026-08-01"),
    ]);

    expect(groups.map((g) => g.key)).toEqual(["2026-08", "2025-08"]);
  });

  it("orders by the date, not by a localised label", () => {
    // The key used to be `toLocaleString("default", {month:"long", year:"numeric"})`
    // parsed back through an English-only lookup table. On a French device that
    // produced "août 2026", on Spanish "agosto de 2026", and the sort key came
    // out NaN -- so month order in an exported PDF was undefined for anyone not
    // running an English locale. The key is derived from the date now.
    const groups = groupEntriesByMonth([
      entry("2026-01-05"),
      entry("2026-12-05"),
      entry("2026-06-05"),
    ]);

    expect(groups.map((g) => g.key)).toEqual(["2026-12", "2026-06", "2026-01"]);
  });

  it("still offers a human label for each group", () => {
    const [group] = groupEntriesByMonth([entry("2026-08-15")]);

    expect(group.label).toMatch(/2026/);
    expect(group.label.length).toBeGreaterThan(4);
  });

  it("returns nothing for no entries", () => {
    expect(groupEntriesByMonth([])).toEqual([]);
  });
});
