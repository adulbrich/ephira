/**
 * Delete Data against the in-memory database, with stand-ins for the two
 * native modules that keep state of their own: the notification centre, and
 * the file system the exports are written to.
 */
import { birthControlOptions } from "@/constants/BirthControlTypes";
import { medicationOptions } from "@/constants/Medications";
import { moodOptions } from "@/constants/Moods";
import { symptomOptions } from "@/constants/Symptoms";
import { onCatalogueInvalidated } from "@/db/catalogue";
import { getAllDays, insertDay } from "@/db/operations/days";
import {
  getAllPregnancyDays,
  upsertPregnancyDay,
} from "@/db/operations/pregnancyDays";
import { getAllMedications } from "@/db/operations/medications";
import { getAllMoods } from "@/db/operations/moods";
import { getAllSettings, insertSetting } from "@/db/operations/settings";
import { getAllSymptoms, insertSymptom } from "@/db/operations/symptoms";
import { deleteAllAppData } from "@/services/deleteAllAppData";
import { EXPORT_FILES } from "@/services/exportFiles";
import { resetTestDatabase } from "@/__tests__/helpers/testDatabase";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

const mockScheduled = new Set<string>();
const mockPresented = new Set<string>();
const mockCancelAll = jest.fn(async () => mockScheduled.clear());
jest.mock("expo-notifications", () => ({
  cancelAllScheduledNotificationsAsync: () => mockCancelAll(),
  dismissAllNotificationsAsync: async () => mockPresented.clear(),
}));

const mockFiles = new Set<string>();
const mockDeleteFile = jest.fn();
jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  documentDirectory: "file:///documents/",
  deleteAsync: async (uri: string, options?: { idempotent?: boolean }) => {
    await mockDeleteFile(uri);
    if (!mockFiles.delete(uri) && !options?.idempotent) {
      throw new Error(`No file at ${uri}`);
    }
  },
}));

/**
 * A user who logged both modes, added a symptom, set a password, was reminded,
 * and exported every format.
 */
async function leaveDataEverywhere() {
  await insertDay("2026-03-01", 3, new Date(2026, 2, 1));
  await upsertPregnancyDay("2026-05-01", 4, [], [], "first kicks");
  await insertSymptom("Vertigo", true);
  await insertSetting("password", "hash");
  mockScheduled.add("Period Expected Tomorrow");
  mockPresented.add("Period Coming Soon");
  for (const uri of Object.values(EXPORT_FILES)) mockFiles.add(uri);
}

beforeEach(() => {
  resetTestDatabase();
  mockScheduled.clear();
  mockPresented.clear();
  mockFiles.clear();
  mockCancelAll.mockImplementation(async () => mockScheduled.clear());
  mockDeleteFile.mockReset();
});

describe("deleteAllAppData", () => {
  it("leaves no data, notification or export file behind", async () => {
    await leaveDataEverywhere();

    await deleteAllAppData();

    expect(await getAllPregnancyDays()).toEqual([]);
    expect([...mockScheduled]).toEqual([]);
    expect([...mockPresented]).toEqual([]);
    expect([...mockFiles]).toEqual([]);
  });

  it("deletes notifications and exports before the database", async () => {
    // So a kill part-way leaves the data, and the lock with it, to try again
    // with, rather than an empty database and reminders still due to fire.
    await leaveDataEverywhere();
    const daysLeft: number[] = [];
    const countDays = async () => {
      daysLeft.push((await getAllDays()).length);
    };
    mockCancelAll.mockImplementationOnce(async () => {
      await countDays();
      mockScheduled.clear();
    });
    mockDeleteFile.mockImplementation(countDays);

    await deleteAllAppData();

    expect(daysLeft).toEqual([1, 1, 1, 1]);
    expect(await getAllDays()).toEqual([]);
  });

  it("leaves the database as a fresh install has it", async () => {
    await leaveDataEverywhere();
    const catalogueInvalidated = jest.fn();
    onCatalogueInvalidated(catalogueInvalidated);

    await deleteAllAppData();

    const names = (rows: { name: string }[]) => rows.map((row) => row.name);
    expect(names(await getAllSymptoms())).toEqual(symptomOptions);
    expect(names(await getAllMoods())).toEqual(moodOptions);
    expect(names(await getAllMedications())).toEqual([
      ...medicationOptions,
      ...birthControlOptions,
    ]);
    expect((await getAllSettings()).map((setting) => setting.name)).toEqual([
      "databaseInitialSetup",
    ]);
    expect(catalogueInvalidated).toHaveBeenCalled();
  });

  it("cancels what a prediction refresh scheduled while it ran", async () => {
    // A refresh that read the flow before the delete can schedule after the
    // first cancel and before the database goes.
    await leaveDataEverywhere();
    mockDeleteFile.mockImplementationOnce(async () => {
      mockScheduled.add("Period Coming Soon");
    });

    await deleteAllAppData();

    expect([...mockScheduled]).toEqual([]);
  });

  it("finishes when no export was ever made", async () => {
    await expect(deleteAllAppData()).resolves.toBeUndefined();
  });

  it("tries every step when one fails, and says so", async () => {
    await leaveDataEverywhere();
    mockCancelAll.mockRejectedValueOnce(new Error("notifications unavailable"));

    await expect(deleteAllAppData()).rejects.toThrow();

    expect(await getAllPregnancyDays()).toEqual([]);
    expect([...mockPresented]).toEqual([]);
    expect([...mockFiles]).toEqual([]);
  });

  it("finishes the job when tried again after a failure", async () => {
    await leaveDataEverywhere();
    mockCancelAll.mockRejectedValueOnce(new Error("notifications unavailable"));
    await expect(deleteAllAppData()).rejects.toThrow();

    await deleteAllAppData();

    expect([...mockScheduled]).toEqual([]);
  });
});
