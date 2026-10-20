import {
  getTestDatabase,
  resetTestDatabase,
} from "@/__tests__/helpers/testDatabase";
import { getAllDataAsJson } from "@/db/database";
import { getDay, insertDay } from "@/db/operations/days";
import { getMood, insertMood } from "@/db/operations/moods";
import { insertMoodEntry } from "@/db/operations/moodEntries";
import { getSymptom, insertSymptom } from "@/db/operations/symptoms";
import { insertSymptomEntry } from "@/db/operations/symptomEntries";
import { getMedication, insertMedication } from "@/db/operations/medications";
import { insertMedicationEntry } from "@/db/operations/medicationEntries";
import { upsertPregnancyDay } from "@/db/operations/pregnancyDays";
import { insertPregnancyAppointment } from "@/db/operations/pregnancyAppointments";
import { pregnancyDays } from "@/db/schema";
import { toCsv, toJson } from "@/services/exportRows";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

const checkedOn = new Date("2026-08-03T12:00:00Z");

/** The id of a row the seed just wrote. */
async function idOf(row: Promise<{ id: number } | undefined>) {
  const found = await row;
  if (!found) throw new Error("the seed did not write that row");
  return found.id;
}

async function exported() {
  const data = await getAllDataAsJson();
  if (!data) throw new Error("getAllDataAsJson read nothing");
  return data;
}

async function seedCycleDays() {
  await insertMood("Happy", true);
  await insertMood("Calm", true);
  await insertSymptom("Cramps", true);
  await insertMedication("Ibuprofen", true);
  await insertMedication("Pill", true, "birth control");

  await insertDay("2026-08-01", 3, checkedOn, 'said "ok", then left');
  await insertDay("2026-08-02", 0, checkedOn);
  await insertDay("2026-07-30", 1, checkedOn);

  const aug1 = await idOf(getDay("2026-08-01"));
  const aug2 = await idOf(getDay("2026-08-02"));
  await insertMoodEntry(aug1, await idOf(getMood("Happy")));
  await insertSymptomEntry(aug1, await idOf(getSymptom("Cramps")));
  await insertMedicationEntry(
    aug1,
    await idOf(getMedication("Ibuprofen")),
    "08:00",
  );
  await insertMoodEntry(aug2, await idOf(getMood("Calm")));
  await insertMedicationEntry(
    aug2,
    await idOf(getMedication("Pill")),
    "21:00",
    "with food",
  );
}

async function seedPregnancy() {
  // 2026-08-01 is also a cycle day; the rest are pregnancy only.
  await upsertPregnancyDay(
    "2026-08-01",
    12,
    ["Nausea", "Back pain"],
    ["Happy"],
    "first kicks",
  );
  await upsertPregnancyDay("2026-09-10", 0, [], ["Calm"]);
  await upsertPregnancyDay("2026-09-15", null, undefined, undefined, "tired");

  // Out of date order, and two on one date, to pin the order they come out in.
  await insertPregnancyAppointment("2026-09-20", "Checkup", "OB Visit");
  await insertPregnancyAppointment(
    "2026-09-10",
    "Anatomy scan",
    "Ultrasound",
    "20 weeks",
  );
  await insertPregnancyAppointment("2026-09-10", "Blood draw", "Lab Work");
}

// The cycle days as main wrote them before pregnancy data joined the export,
// captured from that code. Every key is here in the order it was written.
const cycleDaysJson = {
  "2026-07-30": {
    date: "2026-07-30",
    flow_intensity: 1,
    notes: "",
    moods: [],
    symptoms: [],
    medications: [],
    birth_control: [],
  },
  "2026-08-01": {
    date: "2026-08-01",
    flow_intensity: 3,
    notes: 'said "ok", then left',
    moods: ["Happy"],
    symptoms: ["Cramps"],
    medications: [{ name: "Ibuprofen", time_taken: "08:00" }],
    birth_control: [],
  },
  "2026-08-02": {
    date: "2026-08-02",
    flow_intensity: 0,
    notes: "",
    moods: ["Calm"],
    symptoms: [],
    medications: [],
    birth_control: [{ name: "Pill", time_taken: "21:00", notes: "with food" }],
  },
};

const cycleCsvHeader =
  "Date,Flow Intensity,Notes,symptom.Cramps,mood.Happy,mood.Calm,medication.Ibuprofen,birth_control.Pill,birth_control.Pill.notes";

const cycleCsvRows = [
  '2026-07-30,1,"",,,,,,',
  '2026-08-01,3,"said ""ok"", then left",x,x,,x,,',
  '2026-08-02,0,"",,,x,,x,"Time: 21:00, Notes: with food"',
];

beforeEach(() => {
  resetTestDatabase();
});

describe("a cycle-only export", () => {
  // Pinned to the bytes main wrote, so that whatever reads an export from a
  // phone without pregnancy data sees no change at all.
  beforeEach(seedCycleDays);

  it("writes the JSON it always has", async () => {
    const data = await exported();

    expect(toJson(data)).toBe(JSON.stringify(cycleDaysJson, null, 2));
  });

  it("writes the CSV it always has", async () => {
    const data = await exported();

    expect(toCsv(data)).toBe([cycleCsvHeader, ...cycleCsvRows].join("\n"));
  });
});

describe("an export from a phone with pregnancy data", () => {
  beforeEach(async () => {
    await seedCycleDays();
    await seedPregnancy();
  });

  it("reads every pregnancy day and appointment", async () => {
    const data = await exported();

    expect(data.pregnancyDays).toEqual({
      "2026-08-01": {
        kicks: 12,
        symptoms: ["Nausea", "Back pain"],
        moods: ["Happy"],
        notes: "first kicks",
      },
      "2026-09-10": { kicks: 0, symptoms: [], moods: ["Calm"] },
      "2026-09-15": { symptoms: [], moods: [], notes: "tired" },
    });
    expect(data.pregnancyAppointments).toEqual({
      "2026-09-10": [
        { title: "Anatomy scan", type: "Ultrasound", notes: "20 weeks" },
        { title: "Blood draw", type: "Lab Work" },
      ],
      "2026-09-20": [{ title: "Checkup", type: "OB Visit" }],
    });
  });

  it("carries all of it in the JSON, under the date it belongs to", async () => {
    const data = await exported();

    expect(toJson(data)).toBe(
      JSON.stringify(
        {
          "2026-07-30": cycleDaysJson["2026-07-30"],
          "2026-08-01": {
            ...cycleDaysJson["2026-08-01"],
            pregnancy: {
              kicks: 12,
              symptoms: ["Nausea", "Back pain"],
              moods: ["Happy"],
              notes: "first kicks",
            },
          },
          "2026-08-02": cycleDaysJson["2026-08-02"],
          // A date with no cycle day carries no cycle fields: a flow of 0
          // here would claim a logged day the database does not hold.
          "2026-09-10": {
            date: "2026-09-10",
            pregnancy: { kicks: 0, symptoms: [], moods: ["Calm"] },
            appointments: [
              { title: "Anatomy scan", type: "Ultrasound", notes: "20 weeks" },
              { title: "Blood draw", type: "Lab Work" },
            ],
          },
          "2026-09-15": {
            date: "2026-09-15",
            pregnancy: { symptoms: [], moods: [], notes: "tired" },
          },
          "2026-09-20": {
            date: "2026-09-20",
            appointments: [{ title: "Checkup", type: "OB Visit" }],
          },
        },
        null,
        2,
      ),
    );
  });

  it("carries all of it in the CSV, in columns after the cycle's", async () => {
    const data = await exported();
    const noCycleDay = ",,,,,,,,"; // flow, notes and six Catalogue columns
    const noPregnancyDay = ",,,,,,"; // kicks, four Catalogue columns, notes

    expect(toCsv(data).split("\n")).toEqual([
      `${cycleCsvHeader},pregnancy.kicks,pregnancy.symptom.Nausea,pregnancy.symptom.Back pain,pregnancy.mood.Happy,pregnancy.mood.Calm,pregnancy.notes,appointments`,
      `${cycleCsvRows[0]}${noPregnancyDay},`,
      `${cycleCsvRows[1]},12,x,x,x,,"first kicks",`,
      `${cycleCsvRows[2]}${noPregnancyDay},`,
      `2026-09-10${noCycleDay},0,,,,x,"","Anatomy scan (Ultrasound): 20 weeks; Blood draw (Lab Work)"`,
      `2026-09-15${noCycleDay},,,,,,"tired",`,
      `2026-09-20${noCycleDay}${noPregnancyDay},"Checkup (OB Visit)"`,
    ]);
  });

  it("gives every CSV row as many fields as the header", async () => {
    const rows = toCsv(await exported()).split("\n");
    // Quoted fields are dropped first, so the commas left are separators.
    const fields = (row: string) => row.replace(/"[^"]*"/g, "").split(",");

    for (const row of rows) {
      expect(fields(row)).toHaveLength(fields(rows[0]).length);
    }
  });
});

describe("a pregnancy day whose stored list cannot be read", () => {
  it("exports what it can rather than failing the export", async () => {
    // The day view writes these columns with JSON.stringify, so nothing the
    // app writes is unreadable. A row that is anyway must not cost the user
    // every other row in the export.
    getTestDatabase()
      .insert(pregnancyDays)
      .values([
        { date: "2026-10-01", kicks: 3, symptoms: "[broken", moods: '{"a":1}' },
        { date: "2026-10-02", symptoms: '["Nausea", 3, null]', notes: "ok" },
      ])
      .run();

    const data = await getAllDataAsJson();

    expect(data?.pregnancyDays).toEqual({
      "2026-10-01": { kicks: 3, symptoms: [], moods: [] },
      "2026-10-02": { symptoms: ["Nausea"], moods: [], notes: "ok" },
    });
  });
});
