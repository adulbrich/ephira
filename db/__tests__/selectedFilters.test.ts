import {
  PREDICTION_FILTER,
  changeFilters,
  nextFilters,
  orderFilters,
} from "@/db/selectedFilters";
import { loadCalendarFilters } from "@/db/preferences";
import { getSetting } from "@/db/operations/settings";
import { SettingsKeys } from "@/constants/Settings";
import { resetTestDatabase } from "@/__tests__/helpers/testDatabase";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

beforeEach(() => {
  resetTestDatabase();
});

/** What is actually on disk, without going through a loader's defaulting. */
async function storedFilters(): Promise<string[] | null> {
  const stored = await getSetting(SettingsKeys.calendarFilters);
  return stored?.value ? JSON.parse(stored.value) : null;
}

describe("orderFilters", () => {
  it("puts Flow first", () => {
    expect(orderFilters(["Cramps", "Flow", "Notes"])).toEqual([
      "Flow",
      "Cramps",
      "Notes",
    ]);
  });

  it("leaves a list that has no Flow alone", () => {
    expect(orderFilters(["Cramps", "Notes"])).toEqual(["Cramps", "Notes"]);
  });

  it("does not mutate its argument", () => {
    const input = ["Cramps", "Flow"];
    orderFilters(input);
    expect(input).toEqual(["Cramps", "Flow"]);
  });
});

describe("nextFilters", () => {
  it("removes a name", () => {
    expect(nextFilters(["Flow", "Cramps"], { remove: "Cramps" })).toEqual([
      "Flow",
    ]);
  });

  it("removing a name that is not there changes nothing", () => {
    expect(nextFilters(["Flow"], { remove: "Cramps" })).toEqual(["Flow"]);
  });

  it("adds a name", () => {
    expect(nextFilters(["Flow"], { add: "Cramps" })).toEqual([
      "Flow",
      "Cramps",
    ]);
  });

  it("adding a name already present does not duplicate it", () => {
    expect(nextFilters(["Flow", "Cramps"], { add: "Cramps" })).toEqual([
      "Flow",
      "Cramps",
    ]);
  });

  it("applies Flow-first ordering however the change arrived", () => {
    expect(nextFilters(["Cramps"], { add: "Flow" })).toEqual([
      "Flow",
      "Cramps",
    ]);
    expect(nextFilters([], { replace: ["Notes", "Flow"] })).toEqual([
      "Flow",
      "Notes",
    ]);
  });
});

describe("changeFilters", () => {
  it("returns the same list it wrote to disk", async () => {
    const returned = await changeFilters([], { replace: ["Notes", "Flow"] });

    expect(returned).toEqual(["Flow", "Notes"]);
    expect(await storedFilters()).toEqual(returned);
  });

  it("survives a restart without the name that was removed", async () => {
    // The defect this seam exists to make unrepresentable: deleting a Catalogue
    // item that is an active filter used to hand the updated list to the store
    // and write the list from before the change to disk, so the filter came
    // back on the next cold start.
    await changeFilters([], { replace: ["Flow", "Cramps"] });

    const afterDelete = await changeFilters(["Flow", "Cramps"], {
      remove: "Cramps",
    });

    expect(afterDelete).toEqual(["Flow"]);
    expect(await loadCalendarFilters()).toEqual(["Flow"]);
  });

  it("keeps Flow first on disk however the change arrived", async () => {
    await changeFilters(["Notes"], { add: "Flow" });

    expect(await storedFilters()).toEqual(["Flow", "Notes"]);
  });

  it("durably drops the Prediction filter when it is turned off", async () => {
    // CyclePrediction used to edit the store's list and never write this key at
    // all, so loadCalendarFilters rehydrated a filter the user had removed.
    const on = await changeFilters(["Flow"], { add: PREDICTION_FILTER });
    expect(on).toContain(PREDICTION_FILTER);

    const off = await changeFilters(on, { remove: PREDICTION_FILTER });

    expect(off).toEqual(["Flow"]);
    expect(await loadCalendarFilters()).toEqual(["Flow"]);
  });

  it("can empty the list", async () => {
    await changeFilters([], { replace: ["Flow"] });

    expect(await changeFilters(["Flow"], { remove: "Flow" })).toEqual([]);
    expect(await loadCalendarFilters()).toEqual([]);
  });
});

describe("PREDICTION_FILTER", () => {
  it("is the one spelling of the name", () => {
    // It was a bare literal at seven sites and a private constant at an eighth.
    expect(PREDICTION_FILTER).toBe("Cycle Prediction");
  });
});
