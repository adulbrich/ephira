/**
 * Delete Data against the in-memory database, with stand-ins for the two
 * native modules that keep state of their own: the notification centre, and
 * the file system the exports are written to. Two tests make a database step
 * fail through a spy: the file replacement, and the catalogue reseed. The
 * replacement itself, file by file and key by key, is tested in
 * db/__tests__/databaseFile.test.ts.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getHasSeenWalkthrough } from "@/assets/src/onboarding/onboarding-storage";
import { birthControlOptions } from "@/constants/BirthControlTypes";
import { medicationOptions } from "@/constants/Medications";
import { moodOptions } from "@/constants/Moods";
import { symptomOptions } from "@/constants/Symptoms";
import {
  invalidateCatalogue,
  loadCatalogue,
  onCatalogueInvalidated,
} from "@/db/catalogue";
import * as database from "@/db/database";
import * as setup from "@/db/operations/setup";
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
import { EXPORT_FILES, LEGACY_PDF_EXPORT } from "@/services/exportFiles";
import { resetTestDatabase } from "@/__tests__/helpers/testDatabase";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
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
  await AsyncStorage.setItem("ephira.hasSeenWalkthrough", "true");
  mockScheduled.add("Period Expected Tomorrow");
  mockPresented.add("Period Coming Soon");
  for (const uri of Object.values(EXPORT_FILES)) mockFiles.add(uri);
  mockFiles.add(LEGACY_PDF_EXPORT);
}

beforeEach(() => {
  resetTestDatabase();
  invalidateCatalogue();
  mockScheduled.clear();
  mockPresented.clear();
  mockFiles.clear();
  mockCancelAll.mockImplementation(async () => mockScheduled.clear());
  mockDeleteFile.mockReset();
  mockCancelAll.mockClear();
});
afterEach(() => jest.restoreAllMocks());

describe("deleteAllAppData", () => {
  it("leaves no data, notification or export file behind", async () => {
    await leaveDataEverywhere();

    await deleteAllAppData();

    expect(await getAllPregnancyDays()).toEqual([]);
    expect([...mockScheduled]).toEqual([]);
    expect([...mockPresented]).toEqual([]);
    expect([...mockFiles]).toEqual([]);
    // A fresh install shows the walkthrough.
    expect(await getHasSeenWalkthrough()).toBe(false);
  });

  it("removes each export where this build and older ones wrote it", async () => {
    // Literal paths rather than EXPORT_FILES: a test that read the list on
    // both sides could not see an entry move. Older builds wrote the PDF to
    // Documents, which iOS backs up; this one writes it to the cache.
    for (const uri of [
      "file:///cache/ephira_data.csv",
      "file:///cache/ephira_data.json",
      "file:///cache/ephira.pdf",
      "file:///documents/ephira.pdf",
    ]) {
      mockFiles.add(uri);
    }

    await deleteAllAppData();

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

    expect(daysLeft).toEqual([1, 1, 1, 1, 1]);
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

  it("tells the Catalogue's readers once the defaults are back", async () => {
    await leaveDataEverywhere();
    let symptomsSeen: Promise<string[]> | undefined;
    onCatalogueInvalidated(() => {
      symptomsSeen = loadCatalogue().then((catalogue) => catalogue.symptoms);
    });

    await deleteAllAppData();

    expect(await symptomsSeen).toEqual(symptomOptions);
  });

  it("reports the delete done when only the reseed fails", async () => {
    // The data is gone; the next launch seeds the catalogue instead.
    await leaveDataEverywhere();
    jest
      .spyOn(database, "seedCatalogueOnce")
      .mockRejectedValueOnce(new Error("database or disk is full"));
    const catalogueInvalidated = jest.fn();
    onCatalogueInvalidated(catalogueInvalidated);

    await expect(deleteAllAppData()).resolves.toBeUndefined();

    expect(await getAllPregnancyDays()).toEqual([]);
    expect(catalogueInvalidated).toHaveBeenCalled();
  });

  it("runs one delete at a time", async () => {
    // Overlapping runs can interleave one's delete with the other's reseed
    // and leave an empty catalogue marked as seeded.
    await leaveDataEverywhere();

    await Promise.all([deleteAllAppData(), deleteAllAppData()]);

    expect(mockCancelAll).toHaveBeenCalledTimes(2);
    expect(await getAllSymptoms()).toHaveLength(symptomOptions.length);
  });

  it("finishes when no export was ever made", async () => {
    await expect(deleteAllAppData()).resolves.toBeUndefined();
  });

  it("tries every step when one fails, and says so", async () => {
    await leaveDataEverywhere();
    mockCancelAll.mockRejectedValueOnce(new Error("notifications unavailable"));

    await expect(deleteAllAppData()).rejects.toMatchObject({
      failed: ["scheduled notifications"],
      databaseDeleted: true,
    });

    expect(await getAllPregnancyDays()).toEqual([]);
    expect([...mockPresented]).toEqual([]);
    expect([...mockFiles]).toEqual([]);
  });

  it("says when the database itself was not deleted", async () => {
    await leaveDataEverywhere();
    jest
      .spyOn(setup, "replaceDatabase")
      .mockRejectedValueOnce(new Error("disk I/O error"));

    await expect(deleteAllAppData()).rejects.toMatchObject({
      failed: ["database"],
      databaseDeleted: false,
    });
  });

  it("finishes the job when tried again after a failure", async () => {
    await leaveDataEverywhere();
    mockCancelAll.mockRejectedValueOnce(new Error("notifications unavailable"));
    await expect(deleteAllAppData()).rejects.toThrow();

    await deleteAllAppData();

    expect([...mockScheduled]).toEqual([]);
  });
});
