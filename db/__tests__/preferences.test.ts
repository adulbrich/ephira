import {
  DEFAULT_CALENDAR_FILTERS,
  loadCalendarFilters,
  loadCyclePredictionChoice,
} from "@/db/preferences";
import { getSetting, insertSetting } from "@/db/operations/settings";
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
