import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { Alert } from "react-native";
import { PaperProvider } from "react-native-paper";
import DeleteData from "@/components/settings/DeleteData";
import { useAppRestart } from "@/stores/app-restart";
import { resetTestDatabase } from "@/__tests__/helpers/testDatabase";
import {
  DEFAULT_CALENDAR_FILTERS,
  DEFAULT_CYCLE_PREDICTION_CHOICE,
} from "@/db/preferences";
import {
  useCalendarFilters,
  useDatabaseChangeNotifier,
  usePredictedCycle,
  usePredictionChoice,
  useSelectedDate,
  useThemeColor,
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
  deleteAllAppData: () => mockDeleteAllAppData(),
}));

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
  usePregnancyAppointments.getState().setAppointments([
    {
      id: 1,
      date: "2026-05-02",
      title: "Anatomy scan",
      type: null,
      notes: null,
    },
  ]);
  useContractionTimerStore.setState({ lastDurationMs: 45_000 });
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
  useDatabaseChangeNotifier.getState().setDatabaseChange("before");
}

/** Whether the open screens have let go of it and will read again. */
function expectScreensToLetGo() {
  expect(useSelectedDate.getState().date).toBe("");
  expect(usePregnancySelectedDate.getState().date).toBe("");
  expect(usePregnancySelectedDate.getState().notes).toBe("");
  expect(usePregnancyAppointments.getState().appointments).toEqual([]);
  expect(useContractionTimerStore.getState().lastDurationMs).toBeNull();
  expect(usePredictedCycle.getState().predictedCycle).toEqual([]);
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

  it("stays put after a failure, so trying again is one tap", async () => {
    mockDeleteAllAppData.mockRejectedValue(new Error("notifications"));
    await confirmDelete();

    expect(useAppRestart.getState().restarting).toBe(false);
  });

  it("has them let go after a failure too, since the database may be gone", async () => {
    mockDeleteAllAppData.mockRejectedValue(new Error("notifications"));
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
    mockDeleteAllAppData.mockRejectedValue(new Error("disk I/O error"));

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
