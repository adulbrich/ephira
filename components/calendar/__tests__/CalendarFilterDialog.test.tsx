import { fireEvent, render, screen } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import CalendarFilterDialog from "@/components/calendar/CalendarFilterDialog";
import { invalidateCatalogue } from "@/db/catalogue";
import { PREDICTION_FILTER } from "@/db/selectedFilters";
import {
  useCalendarFilters,
  usePredictionChoice,
} from "@/stores/calendar-storage";
import { resetTestDatabase } from "@/__tests__/helpers/testDatabase";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

beforeEach(() => {
  resetTestDatabase();
  invalidateCatalogue();
  usePredictionChoice.getState().setPredictionChoice(true);
  useCalendarFilters.getState().setSelectedFilters(["Flow", PREDICTION_FILTER]);
});

it("keeps a selected Cycle Prediction switch on screen while it is turned off with too few cycles", async () => {
  await render(<CalendarFilterDialog visible setVisible={() => {}} />, {
    wrapper: PaperProvider,
  });
  // The chip and the switch's row.
  expect(await screen.findAllByText(PREDICTION_FILTER)).toHaveLength(2);

  // Flow, Cycle Start/End, Cycle Prediction.
  await fireEvent(screen.getAllByRole("switch")[2], "valueChange", false);

  // The chip goes; the switch stays, so it can be turned back on.
  expect(screen.getAllByText(PREDICTION_FILTER)).toHaveLength(1);
});
