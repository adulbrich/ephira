/**
 * Delete Data against the in-memory database, with stand-ins for the two
 * native modules that keep state of their own: the notification centre, and
 * the file system the exports are written to.
 */
import { insertDay } from "@/db/operations/days";
import {
  getAllPregnancyDays,
  upsertPregnancyDay,
} from "@/db/operations/pregnancyDays";
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
jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  documentDirectory: "file:///documents/",
  deleteAsync: async (uri: string, options?: { idempotent?: boolean }) => {
    if (!mockFiles.delete(uri) && !options?.idempotent) {
      throw new Error(`No file at ${uri}`);
    }
  },
}));

/** A user who logged both modes, was reminded, and exported every format. */
async function useTheApp() {
  await insertDay("2026-03-01", 3, new Date(2026, 2, 1));
  await upsertPregnancyDay("2026-05-01", 4, [], [], "first kicks");
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
});

describe("deleteAllAppData", () => {
  it("leaves no data, notification or export file behind", async () => {
    await useTheApp();

    await deleteAllAppData();

    expect(await getAllPregnancyDays()).toEqual([]);
    expect([...mockScheduled]).toEqual([]);
    expect([...mockPresented]).toEqual([]);
    expect([...mockFiles]).toEqual([]);
  });

  it("finishes when no export was ever made", async () => {
    await expect(deleteAllAppData()).resolves.toBeUndefined();
  });

  it("tries every step when one fails, and says so", async () => {
    await useTheApp();
    mockCancelAll.mockRejectedValueOnce(new Error("notifications unavailable"));

    await expect(deleteAllAppData()).rejects.toThrow();

    expect(await getAllPregnancyDays()).toEqual([]);
    expect([...mockPresented]).toEqual([]);
    expect([...mockFiles]).toEqual([]);
  });

  it("finishes the job when tried again after a failure", async () => {
    await useTheApp();
    mockCancelAll.mockRejectedValueOnce(new Error("notifications unavailable"));
    await expect(deleteAllAppData()).rejects.toThrow();

    await deleteAllAppData();

    expect([...mockScheduled]).toEqual([]);
  });
});
