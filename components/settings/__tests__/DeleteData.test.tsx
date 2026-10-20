import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { Alert } from "react-native";
import { PaperProvider } from "react-native-paper";
import DeleteData from "@/components/settings/DeleteData";
import { insertSetting } from "@/db/operations/settings";
import { DeletionIncomplete } from "@/services/deleteAllAppData";
import { useAppRestart } from "@/stores/app-restart";
import { resetTestDatabase } from "@/__tests__/helpers/testDatabase";
import {
  DEFAULT_CALENDAR_FILTERS,
  DEFAULT_CYCLE_PREDICTION_CHOICE,
} from "@/db/preferences";
import {
  useCalendarFilters,
  useData,
  useDatabaseChangeNotifier,
  usePredictedCycle,
  usePredictionChoice,
  useSelectedDate,
  useThemeColor,
  useTrackingMode,
} from "@/stores/calendar-storage";
import {
  useContractionTimerStore,
  usePregnancyAppointments,
  usePregnancySelectedDate,
} from "@/stores/pregnancy-storage";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

const mockDeleteAllAppData = jest.fn();
jest.mock("@/services/deleteAllAppData", () => ({
  ...jest.requireActual("@/services/deleteAllAppData"),
  deleteAllAppData: () => mockDeleteAllAppData(),
}));

/** A delete whose database step went through, though another step failed. */
const databaseGoneButNotAll = () =>
  new DeletionIncomplete(["scheduled notifications"]);

/** A delete that rolled back: the database holds everything it held. */
const databaseKept = () => new DeletionIncomplete(["database"]);

async function confirmDelete() {
  await render(<DeleteData />, { wrapper: PaperProvider });
  await fireEvent.press(screen.getByText("Delete all data from this device"));
  const modal = within(screen.getByTestId("modal"));
  await fireEvent.changeText(
    modal.getByPlaceholderText("delete data"),
    "delete data",
  );
  await fireEvent.press(modal.getByRole("button", { name: "Delete Data" }));
  return modal;
}

/** A day open in each mode, and what the stores drew from the logged days. */
function holdDataOnScreen() {
  useSelectedDate.getState().setDate("2026-03-01");
  usePregnancySelectedDate.getState().setDate("2026-05-01");
  usePregnancySelectedDate.getState().setNotes("first kicks");
  usePregnancySelectedDate.getState().setKicks(4);
  usePregnancySelectedDate.getState().setSymptoms(["Nausea"]);
  usePregnancySelectedDate.getState().setMoods(["Calm"]);
  useData
    .getState()
    .setData([{ id: 1, date: "2026-03-01", flow_intensity: 3 }]);
  usePregnancyAppointments.getState().setAppointments([
    {
      id: 1,
      date: "2026-05-02",
      title: "Anatomy scan",
      type: null,
      notes: null,
    },
  ]);
  useContractionTimerStore.setState({
    isRunning: true,
    startAt: 1,
    lastDurationMs: 45_000,
  });
  // Preferences, which Settings writes back whole on the next change: a
  // filter can name a custom symptom.
  useCalendarFilters.getState().setSelectedFilters(["Flow", "Vertigo"]);
  usePredictionChoice
    .getState()
    .setPredictionChoice(!DEFAULT_CYCLE_PREDICTION_CHOICE);
  useThemeColor.getState().setThemeColor("pink");
  usePredictedCycle
    .getState()
    .setPredictedCycle([{ date: "2026-03-29", confidence: 80 }]);
  usePredictedCycle
    .getState()
    .setPredictedMarkedDates({ "2026-03-29": { periods: [] } });
  useTrackingMode.getState().setTrackingMode("pregnancy");
  useDatabaseChangeNotifier.getState().setDatabaseChange("before");
}

/** Whether the open screens have let go of it and will read again. */
function expectScreensToLetGo() {
  expect(useSelectedDate.getState().date).toBe("");
  expect(usePregnancySelectedDate.getState().date).toBe("");
  expect(usePregnancySelectedDate.getState()).toMatchObject({
    notes: "",
    kicks: 0,
    symptoms: [],
    moods: [],
  });
  expect(useData.getState().data).toEqual([]);
  expect(usePregnancyAppointments.getState().appointments).toEqual([]);
  expect(useContractionTimerStore.getState()).toMatchObject({
    isRunning: false,
    startAt: null,
    lastDurationMs: null,
  });
  expect(usePredictedCycle.getState().predictedCycle).toEqual([]);
  expect(usePredictedCycle.getState().predictedMarkedDates).toEqual({});
  expect(useTrackingMode.getState().trackingMode).toBe("cycle");
  expect(useCalendarFilters.getState().selectedFilters).toEqual([
    ...DEFAULT_CALENDAR_FILTERS,
  ]);
  expect(usePredictionChoice.getState().predictionChoice).toBe(
    DEFAULT_CYCLE_PREDICTION_CHOICE,
  );
  expect(useThemeColor.getState().themeColor).toBe("purple");
  expect(useDatabaseChangeNotifier.getState().databaseChange).not.toBe(
    "before",
  );
}

beforeEach(() => {
  resetTestDatabase();
  mockDeleteAllAppData.mockReset();
  useAppRestart.getState().finishRestart();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe("Delete Data", () => {
  it("says the data is gone once it is", async () => {
    mockDeleteAllAppData.mockResolvedValue(undefined);

    await confirmDelete();

    expect(Alert.alert).toHaveBeenCalledWith(
      "Data deleted",
      "All data has been deleted from this device.",
    );
  });

  it("has the open screens let go of what they hold", async () => {
    mockDeleteAllAppData.mockResolvedValue(undefined);
    holdDataOnScreen();

    await confirmDelete();

    expectScreensToLetGo();
  });

  it("starts the app again from its first screen, as after a launch", async () => {
    // Screens holding state of their own (the lock setting, pregnancy Home)
    // read it once on mount; mounting them again is what makes them re-read.
    mockDeleteAllAppData.mockResolvedValue(undefined);
    await confirmDelete();

    expect(useAppRestart.getState().restarting).toBe(true);
  });

  it("starts again after a failure that still emptied the database", async () => {
    // Settings screens read once on mount would otherwise write what they
    // hold back into the emptied tables.
    mockDeleteAllAppData.mockRejectedValue(databaseGoneButNotAll());
    await confirmDelete();

    expect(useAppRestart.getState().restarting).toBe(true);
  });

  it("stays put when the database was not deleted, so trying again is one tap", async () => {
    mockDeleteAllAppData.mockRejectedValue(databaseKept());
    await confirmDelete();

    expect(useAppRestart.getState().restarting).toBe(false);
  });

  it("keeps the preferences a rolled-back delete left in place", async () => {
    await insertSetting("theme", "pink");
    await insertSetting("trackingMode", "pregnancy");
    await insertSetting("cyclePredictions", "false");
    await insertSetting("calendarFilters", JSON.stringify(["Flow", "Vertigo"]));
    mockDeleteAllAppData.mockRejectedValue(databaseKept());

    await confirmDelete();

    expect(useThemeColor.getState().themeColor).toBe("pink");
    expect(useTrackingMode.getState().trackingMode).toBe("pregnancy");
    expect(usePredictionChoice.getState().predictionChoice).toBe(false);
    expect(useCalendarFilters.getState().selectedFilters).toEqual([
      "Flow",
      "Vertigo",
    ]);
  });

  it("has them let go after a failure too, since the database may be gone", async () => {
    mockDeleteAllAppData.mockRejectedValue(databaseGoneButNotAll());
    holdDataOnScreen();

    await confirmDelete();

    expectScreensToLetGo();
  });

  it("offers no second delete while one is running", async () => {
    let finish = () => {};
    mockDeleteAllAppData.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    await render(<DeleteData />, { wrapper: PaperProvider });
    await fireEvent.press(screen.getByText("Delete all data from this device"));
    const modal = within(screen.getByTestId("modal"));
    await fireEvent.changeText(
      modal.getByPlaceholderText("delete data"),
      "delete data",
    );

    // Not awaited: React Native Testing Library would wait for the delete.
    const pressing = fireEvent.press(
      modal.getByRole("button", { name: "Delete Data" }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(
      modal.queryByRole("button", { name: "Delete Data" }),
    ).not.toBeOnTheScreen();
    finish();
    await pressing;
  });

  it("says so when it is not, and lets the user try again", async () => {
    mockDeleteAllAppData.mockRejectedValue(databaseKept());

    const modal = await confirmDelete();

    expect(Alert.alert).toHaveBeenCalledWith(
      "Data not deleted",
      "Not all data could be deleted. Try again.",
    );
    expect(Alert.alert).not.toHaveBeenCalledWith(
      "Data deleted",
      expect.anything(),
    );
    expect(modal.getByRole("button", { name: "Delete Data" })).toBeEnabled();
  });
});
