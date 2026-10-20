import {
  appointmentDetail,
  birthControlDetail,
  csvField,
  dayLabel,
  groupEntriesByMonth,
  pregnancyEntries,
  toCsv,
  toJson,
} from "@/services/exportRows";
import type {
  ExportData,
  ExportDayEntry,
  ExportPregnancyDay,
} from "@/constants/Interfaces";

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

const exportOf = (
  dailyData: ExportData["dailyData"],
  more: Partial<ExportData> = {},
): ExportData => ({
  headers,
  dailyData,
  pregnancyDays: {},
  pregnancyAppointments: {},
  ...more,
});

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
    const [header] = toCsv(exportOf({})).split("\n");

    expect(header).toBe(
      "date,flow_intensity,notes,symptom.Cramps,mood.Happy,medication.Ibuprofen,birth_control.Pill,birth_control.Pill.notes",
    );
  });

  it("quotes a Catalogue name in the header only when it has to", () => {
    // Custom entries are named by the user. A comma in one split its header
    // into two, so every column after it was labelled with the wrong name.
    const csv = toCsv({
      ...exportOf(
        {},
        {
          pregnancyDays: {
            "2026-08-01": { symptoms: ["Sore, swollen feet"], moods: [] },
          },
        },
      ),
      headers: { ...headers, symptoms: ["Back pain, lower", 'The "bad" one'] },
    });

    expect(csv.split("\n")[0]).toBe(
      'date,flow_intensity,notes,"symptom.Back pain, lower","symptom.The ""bad"" one",mood.Happy,medication.Ibuprofen,birth_control.Pill,birth_control.Pill.notes,pregnancy.kicks,"pregnancy.symptom.Sore, swollen feet",pregnancy.notes',
    );
  });

  it("marks what was logged and leaves the rest blank", () => {
    const csv = toCsv(
      exportOf({
        "2026-08-01": entry("2026-08-01", {
          flow_intensity: 3,
          symptoms: ["Cramps"],
          medications: [{ name: "Ibuprofen" }],
        }),
      }),
    );
    const row = csv.split("\n")[1].split(",");

    expect(row[1]).toBe("3");
    expect(row[3]).toBe("x"); // symptom.Cramps
    expect(row[4]).toBe(""); // mood.Happy
    expect(row[5]).toBe("x"); // medication.Ibuprofen
    expect(row[6]).toBe(""); // birth_control.Pill
  });

  it("survives a note containing a quote and a comma", () => {
    // Before escaping, this row gained columns and the file no longer parsed.
    const csv = toCsv(
      exportOf({
        "2026-08-01": entry("2026-08-01", { notes: 'said "ok", then left' }),
      }),
    );
    const row = csv.split("\n")[1];

    expect(row).toContain('"said ""ok"", then left"');
    expect(csv.split("\n")[0].split(",")).toHaveLength(8);
  });

  it("puts the birth control detail in its own field", () => {
    const csv = toCsv(
      exportOf({
        "2026-08-01": entry("2026-08-01", {
          birth_control: [
            { name: "Pill", time_taken: "08:00", notes: "with food" },
          ],
        }),
      }),
    );

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

const pregnancyDay = (
  overrides: Partial<ExportPregnancyDay> = {},
): ExportPregnancyDay => ({ symptoms: [], moods: [], ...overrides });

describe("appointmentDetail", () => {
  it("gives the title alone when nothing else is recorded", () => {
    expect(appointmentDetail({ title: "Checkup" })).toBe("Checkup");
  });

  it("puts the type in parentheses", () => {
    expect(appointmentDetail({ title: "Checkup", type: "OB Visit" })).toBe(
      "Checkup (OB Visit)",
    );
  });

  it("puts the notes after a colon", () => {
    expect(
      appointmentDetail({ title: "Checkup", notes: "bring results" }),
    ).toBe("Checkup: bring results");
  });

  it("gives all three", () => {
    expect(
      appointmentDetail({
        title: "Anatomy scan",
        type: "Ultrasound",
        notes: "20 weeks",
      }),
    ).toBe("Anatomy scan (Ultrasound): 20 weeks");
  });
});

describe("toJson", () => {
  it("writes cycle days exactly as the export always has", () => {
    // The file used to be JSON.stringify(dailyData, null, 2). Without
    // pregnancy data it still is, byte for byte.
    const dailyData = {
      "2026-08-01": entry("2026-08-01", {
        flow_intensity: 2,
        moods: ["Happy"],
      }),
      "2026-08-02": entry("2026-08-02"),
    };

    expect(toJson(exportOf(dailyData))).toBe(
      JSON.stringify(dailyData, null, 2),
    );
  });

  it("orders dates across cycle days, pregnancy days and appointments", () => {
    const json = toJson(
      exportOf(
        {
          "2026-08-01": entry("2026-08-01"),
          "2026-08-10": entry("2026-08-10"),
        },
        {
          pregnancyDays: { "2026-08-05": pregnancyDay({ kicks: 4 }) },
          pregnancyAppointments: { "2026-07-01": [{ title: "Checkup" }] },
        },
      ),
    );

    expect(Object.keys(JSON.parse(json))).toEqual([
      "2026-07-01",
      "2026-08-01",
      "2026-08-05",
      "2026-08-10",
    ]);
  });

  it("gives a date with only pregnancy data no cycle fields", () => {
    const json = toJson(
      exportOf(
        {},
        {
          pregnancyDays: { "2026-08-05": pregnancyDay({ kicks: 4 }) },
          pregnancyAppointments: { "2026-08-05": [{ title: "Checkup" }] },
        },
      ),
    );

    expect(JSON.parse(json)).toEqual({
      "2026-08-05": {
        date: "2026-08-05",
        pregnancy: { kicks: 4, symptoms: [], moods: [] },
        appointments: [{ title: "Checkup" }],
      },
    });
  });
});

describe("toCsv with pregnancy data", () => {
  it("adds only the appointments column when there are no pregnancy days", () => {
    const [header, row] = toCsv(
      exportOf(
        {},
        {
          pregnancyAppointments: {
            "2026-08-05": [{ title: "Checkup" }, { title: "Scan" }],
          },
        },
      ),
    ).split("\n");

    expect(header).toBe(
      "date,flow_intensity,notes,symptom.Cramps,mood.Happy,medication.Ibuprofen,birth_control.Pill,birth_control.Pill.notes,appointments",
    );
    expect(row).toBe('2026-08-05,,,,,,,,"Checkup; Scan"');
  });

  it("leaves the cycle cells blank on a date with no cycle day", () => {
    // A 0 under flow_intensity would claim a logged day that does not exist.
    const [, row] = toCsv(
      exportOf({}, { pregnancyDays: { "2026-08-05": pregnancyDay() } }),
    ).split("\n");

    // Seven blank cycle cells, a blank kicks cell, then the pregnancy notes.
    expect(row).toBe('2026-08-05,,,,,,,,,""');
  });

  it("names pregnancy columns in the order they were first logged", () => {
    const [header] = toCsv(
      exportOf(
        {},
        {
          pregnancyDays: {
            "2026-08-01": pregnancyDay({
              symptoms: ["Nausea"],
              moods: ["Calm"],
            }),
            "2026-08-02": pregnancyDay({
              symptoms: ["Heartburn", "Nausea"],
              moods: ["Happy"],
            }),
          },
        },
      ),
    ).split("\n");

    expect(header.split(",").slice(8)).toEqual([
      "pregnancy.kicks",
      "pregnancy.symptom.Nausea",
      "pregnancy.symptom.Heartburn",
      "pregnancy.mood.Calm",
      "pregnancy.mood.Happy",
      "pregnancy.notes",
    ]);
  });
});

describe("pregnancyEntries", () => {
  it("joins pregnancy days and appointments by date, oldest first", () => {
    const day = pregnancyDay({ kicks: 4 });

    expect(
      pregnancyEntries(
        exportOf(
          { "2026-08-03": entry("2026-08-03") },
          {
            pregnancyDays: { "2026-08-05": day, "2026-08-01": day },
            pregnancyAppointments: {
              "2026-08-05": [{ title: "Checkup" }],
              "2026-08-02": [{ title: "Scan" }],
            },
          },
        ),
      ),
    ).toEqual([
      { date: "2026-08-01", day, appointments: [] },
      { date: "2026-08-02", appointments: [{ title: "Scan" }] },
      { date: "2026-08-05", day, appointments: [{ title: "Checkup" }] },
    ]);
  });

  it("groups into months like the cycle days do", () => {
    const entries = pregnancyEntries(
      exportOf(
        {},
        {
          pregnancyDays: {
            "2026-07-31": pregnancyDay(),
            "2026-08-01": pregnancyDay(),
          },
        },
      ),
    );

    expect(groupEntriesByMonth(entries).map((g) => g.key)).toEqual([
      "2026-08",
      "2026-07",
    ]);
  });
});

describe("dayLabel", () => {
  it("labels the day of the date it is given", () => {
    // The PDF built this from `new Date(date)`, which is midnight UTC, and
    // formatted it in the phone's zone. West of Greenwich that instant is
    // still the day before, so every row carried the previous day's label.
    // Jest runs in Berlin, east of it, so this case alone cannot show that;
    // run it under TZ=America/Los_Angeles with the boundaries runner in
    // .claude/skills/correctness-review to see it.
    expect(dayLabel("2026-08-01")).toMatch(/\b01\b/);
    expect(dayLabel("2026-08-31")).toMatch(/\b31\b/);
    expect(dayLabel("2026-03-29")).toMatch(/\b29\b/); // Berlin's DST change
  });
});
