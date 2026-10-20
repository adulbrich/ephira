import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import CyclePredictions from "@/components/settings/CyclePrediction";
import { insertDay } from "@/db/operations/days";
import {
  DEFAULT_CALENDAR_FILTERS,
  loadCalendarFilters,
  loadCyclePredictionChoice,
} from "@/db/preferences";
import {
  useCalendarFilters,
  useDatabaseChangeNotifier,
  usePredictedCycle,
  usePredictionChoice,
} from "@/stores/calendar-storage";
import { addDays, formatAsISODate, startOfLocalDay } from "@/utils/dates";
import { resetTestDatabase } from "@/__tests__/helpers/testDatabase";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

jest.mock("@/services/notificationService", () => ({
  NotificationService: {
    scheduleAllPredictionNotifications: jest.fn(),
  },
}));

/** Two complete cycles, before today so the forecast lies ahead of it. */
async function logTwoCycles() {
  const today = startOfLocalDay();
  for (const back of [60, 59, 58, 57, 32, 31, 30, 29]) {
    await insertDay(formatAsISODate(addDays(today, -back)), 3, today);
  }
}

beforeEach(async () => {
  resetTestDatabase();
  // What app/_layout.tsx hydrates the stores with on a new install.
  usePredictionChoice
    .getState()
    .setPredictionChoice(await loadCyclePredictionChoice());
  useCalendarFilters.getState().setSelectedFilters(await loadCalendarFilters());
  usePredictedCycle.getState().setPredictedCycle([]);
});

it("keeps predictions on for a new install that opens Settings, and shows them once two cycles exist", async () => {
  // Issue #305: Settings mounts this section whether or not it is expanded,
  // and with nothing logged it used to save the choice as off.
  await render(<CyclePredictions />, { wrapper: PaperProvider });
  await fireEvent.press(screen.getByText(/^Cycle Predictions/));
  await screen.findByText(
    "No flow data logged yet. Start logging to enable predictions!",
  );

  expect(await loadCyclePredictionChoice()).toBe(true);
  expect(usePredictionChoice.getState().predictionChoice).toBe(true);
  expect(useCalendarFilters.getState().selectedFilters).toEqual([
    ...DEFAULT_CALENDAR_FILTERS,
  ]);

  await logTwoCycles();
  await act(async () => {
    useDatabaseChangeNotifier.getState().setDatabaseChange("logged");
  });

  await screen.findByText("Great! You have 2 complete cycles logged.");
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(usePredictedCycle.getState().predictedCycle.length).toBeGreaterThan(0);
});
