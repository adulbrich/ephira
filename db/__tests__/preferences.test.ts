import {
  DEFAULT_CALENDAR_FILTERS,
  loadCalendarFilters,
  loadCyclePredictionChoice,
} from "@/db/preferences";
import { getSetting, insertSetting } from "@/db/operations/settings";
import * as settingsOperations from "@/db/operations/settings";
import { SettingsKeys } from "@/constants/Settings";
import { resetTestDatabase } from "@/__tests__/helpers/testDatabase";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

beforeEach(() => {
  resetTestDatabase();
});

describe("loadCyclePredictionChoice", () => {
  it("returns what the user chose", async () => {
    await insertSetting(SettingsKeys.cyclePredictions, JSON.stringify(false));

    expect(await loadCyclePredictionChoice()).toBe(false);
  });

  it("defaults to on for a user who has never chosen", async () => {
    expect(await loadCyclePredictionChoice()).toBe(true);
  });

  it("writes the default down, so it is a choice on record", async () => {
    await loadCyclePredictionChoice();

    expect((await getSetting(SettingsKeys.cyclePredictions))?.value).toBe(
      JSON.stringify(true),
    );
  });

  it("does not overwrite an existing choice with the default", async () => {
    await insertSetting(SettingsKeys.cyclePredictions, JSON.stringify(false));

    await loadCyclePredictionChoice();

    expect((await getSetting(SettingsKeys.cyclePredictions))?.value).toBe(
      JSON.stringify(false),
    );
  });

  it("falls back to the default rather than throwing on a corrupt value", async () => {
    await insertSetting(SettingsKeys.cyclePredictions, "not json");

    expect(await loadCyclePredictionChoice()).toBe(true);
  });
});

describe("loadCalendarFilters", () => {
  it("returns what the user chose", async () => {
    await insertSetting(
      SettingsKeys.calendarFilters,
      JSON.stringify(["Flow", "Moods"]),
    );

    expect(await loadCalendarFilters()).toEqual(["Flow", "Moods"]);
  });

  it("defaults for a user who has never chosen, and writes it down", async () => {
    expect(await loadCalendarFilters()).toEqual([...DEFAULT_CALENDAR_FILTERS]);
    expect((await getSetting(SettingsKeys.calendarFilters))?.value).toBe(
      JSON.stringify(DEFAULT_CALENDAR_FILTERS),
    );
  });

  it("keeps an empty selection, which is a choice and not an absence", async () => {
    await insertSetting(SettingsKeys.calendarFilters, JSON.stringify([]));

    expect(await loadCalendarFilters()).toEqual([]);
  });

  it("falls back to the default rather than throwing on a corrupt value", async () => {
    await insertSetting(SettingsKeys.calendarFilters, "{not json");

    expect(await loadCalendarFilters()).toEqual([...DEFAULT_CALENDAR_FILTERS]);
  });
});

describe("when the database cannot be read", () => {
  // The app shell calls these before anything has rendered. A rejection there
  // is an uncaught error with nowhere to go, which is what happened on a fresh
  // install while the tables were still being created.
  const failing = () => {
    jest
      .spyOn(settingsOperations, "getSetting")
      .mockRejectedValue(new Error("no such table: settings"));
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("falls back to the default calendar filters rather than rejecting", async () => {
    failing();

    await expect(loadCalendarFilters()).resolves.toEqual([
      ...DEFAULT_CALENDAR_FILTERS,
    ]);
  });

  it("falls back to the default prediction choice rather than rejecting", async () => {
    failing();

    await expect(loadCyclePredictionChoice()).resolves.toBe(true);
  });
});
