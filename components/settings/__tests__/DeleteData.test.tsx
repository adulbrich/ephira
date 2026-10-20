import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { Alert } from "react-native";
import { PaperProvider } from "react-native-paper";
import DeleteData from "@/components/settings/DeleteData";
import {
  useDatabaseChangeNotifier,
  usePredictedCycle,
  useSelectedDate,
} from "@/stores/calendar-storage";
import {
  useContractionTimerStore,
  usePregnancyAppointments,
  usePregnancySelectedDate,
} from "@/stores/pregnancy-storage";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

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
  expect(useDatabaseChangeNotifier.getState().databaseChange).not.toBe(
    "before",
  );
}

beforeEach(() => {
  mockDeleteAllAppData.mockReset();
  mockReplace.mockReset();
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

    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("stays put after a failure, so trying again is one tap", async () => {
    mockDeleteAllAppData.mockRejectedValue(new Error("notifications"));

    await confirmDelete();

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("has them let go after a failure too, since the database may be gone", async () => {
    mockDeleteAllAppData.mockRejectedValue(new Error("notifications"));
    holdDataOnScreen();

    await confirmDelete();

    expectScreensToLetGo();
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
