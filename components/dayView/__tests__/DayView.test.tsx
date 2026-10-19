import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import DayView from "@/components/dayView/DayView";
import { addCatalogueItem, invalidateCatalogue } from "@/db/catalogue";
import { emptyLoggedDay, saveLoggedDay } from "@/db/loggedDay";
import { symptoms } from "@/db/schema";
import {
  getTestDatabase,
  resetTestDatabase,
} from "@/__tests__/helpers/testDatabase";
import {
  useDatabaseChangeNotifier,
  useSelectedDate,
} from "@/stores/calendar-storage";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

const DAY = "2026-10-01";

/** Fixed "today" for the prediction accuracy check the seeding write runs. */
const CHECKED_ON = new Date(2026, 9, 1);

function renderDayView() {
  return render(
    <PaperProvider>
      <DayView />
    </PaperProvider>,
  );
}

/** The Symptoms Section's body is only rendered while it is expanded. */
const symptomsOpen = () => screen.queryByText("Add Your Symptom") !== null;

async function openSymptoms() {
  await screen.findByText(/1 Selected/);
  await fireEvent.press(screen.getByText("Symptoms"));
  expect(symptomsOpen()).toBe(true);
}

const symptomNames = () =>
  getTestDatabase()
    .select({ name: symptoms.name })
    .from(symptoms)
    .all()
    .map((row) => row.name);

beforeEach(async () => {
  resetTestDatabase();
  invalidateCatalogue();
  useSelectedDate.setState({ date: DAY });
  useDatabaseChangeNotifier.setState({ databaseChange: "" });

  await addCatalogueItem("symptom", "Cramps");
  await addCatalogueItem("symptom", "Backtest");
  await saveLoggedDay(
    { ...emptyLoggedDay(DAY), symptoms: ["Backtest"] },
    CHECKED_ON,
  );
});

describe("DayView", () => {
  it("keeps the open Section when Custom Entries deletes one of its Catalogue items", async () => {
    await renderDayView();
    await openSymptoms();

    // Delete Backtest in Custom Entries, opened from the Section, and close it
    // with the header arrow. Paper's icon buttons share one testID, and
    // Custom Entries gives them no label, so they are picked by position.
    // The header's arrow comes first. Backtest's delete comes last: the modal
    // opens with only the Symptoms list mounted, below its add row, and
    // Backtest is the only custom Symptom.
    await fireEvent.press(screen.getByText("Add Your Symptom"));
    const modal = await screen.findByTestId("modal");
    const iconButtons = () => within(modal).getAllByTestId("icon-button");
    await within(modal).findByText("Backtest");
    const beforeDelete = iconButtons();
    await fireEvent.press(beforeDelete[beforeDelete.length - 1]);
    await fireEvent.press(await screen.findByText("Delete Entry"));
    // Custom Entries does not await the delete. Wait for it here, or the close
    // races it.
    await waitFor(() => expect(symptomNames()).toEqual(["Cramps"]));
    await fireEvent.press(iconButtons()[0]);

    await waitFor(() => expect(screen.queryByTestId("modal")).toBeNull());
    await waitFor(() => expect(screen.queryByText(/1 Selected/)).toBeNull());
    expect(symptomsOpen()).toBe(true);

    // The next save must not bring Backtest back. Saving creates any Catalogue
    // name it cannot find, so a selection the reload missed would.
    await fireEvent.press(screen.getByText("Cramps"));
    await screen.findByText("Symptoms Saved!");
    expect(symptomNames()).toEqual(["Cramps"]);
  });

  it("closes the open Section when another day is opened", async () => {
    await renderDayView();
    await openSymptoms();

    await act(async () => {
      useSelectedDate.getState().setDate("2026-10-02");
    });

    await screen.findByText(/October 2, 2026/);
    expect(symptomsOpen()).toBe(false);
  });
});
