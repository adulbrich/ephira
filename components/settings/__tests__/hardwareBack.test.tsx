import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import CustomEntries from "@/components/settings/CustomEntries";
import EntryVisibilitySettings from "@/components/settings/EntryVisibilitySettings";
import { addCatalogueItem } from "@/db/catalogue";
import { recordBackPresses } from "@/__tests__/helpers/backHandler";
import { resetTestDatabase } from "@/__tests__/helpers/testDatabase";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

/**
 * Paper's IconButton gives every icon button the same testID, and these have
 * no accessible name, so position is all there is: the header's arrow and
 * info button, then Custom Entries' add button, then a delete button per
 * custom Catalogue item.
 */
const iconButtons = () => screen.getAllByTestId("icon-button");
const infoButton = () => iconButtons()[1];
const firstDeleteButton = () => iconButtons()[3];

beforeEach(() => resetTestDatabase());
afterEach(() => jest.restoreAllMocks());

describe("Custom Entries on hardware Back", () => {
  const renderCustomEntries = async () => {
    const pressBack = recordBackPresses();
    const onModalClose = jest.fn();
    await render(
      <CustomEntries modalVisibleInitially onModalClose={onModalClose} />,
      { wrapper: PaperProvider },
    );
    return { pressBack, onModalClose };
  };

  it("closes", async () => {
    const { pressBack, onModalClose } = await renderCustomEntries();

    await pressBack();

    expect(onModalClose).toHaveBeenCalledTimes(1);
  });

  it("closes an open info dialog first, then the modal", async () => {
    const { pressBack, onModalClose } = await renderCustomEntries();
    await fireEvent.press(infoButton());
    expect(screen.getByText(/add your own custom entries/)).toBeOnTheScreen();

    await pressBack();

    await waitFor(() =>
      expect(
        screen.queryByText(/add your own custom entries/),
      ).not.toBeOnTheScreen(),
    );
    expect(onModalClose).not.toHaveBeenCalled();

    await pressBack();

    expect(onModalClose).toHaveBeenCalledTimes(1);
  });

  it("cancels the delete dialog without deleting, then closes", async () => {
    await addCatalogueItem("symptom", "Backtest");
    const { pressBack, onModalClose } = await renderCustomEntries();
    await screen.findByText("Backtest");
    await fireEvent.press(firstDeleteButton());
    expect(screen.getByText("Delete Custom Entry")).toBeOnTheScreen();

    await pressBack();

    await waitFor(() =>
      expect(screen.queryByText("Delete Custom Entry")).not.toBeOnTheScreen(),
    );
    expect(screen.getByText("Backtest")).toBeOnTheScreen();
    expect(onModalClose).not.toHaveBeenCalled();

    await pressBack();

    expect(onModalClose).toHaveBeenCalledTimes(1);
  });
});

// The modal is open while its Catalogue kind titles are on the screen: the
// settings row that opens it renders none of them.
describe("Calendar Entries Visibility on hardware Back", () => {
  const openVisibilitySettings = async () => {
    const pressBack = recordBackPresses();
    await render(<EntryVisibilitySettings />, { wrapper: PaperProvider });
    await fireEvent.press(screen.getByText("Calendar Entries Visibility"));
    expect(screen.getByText("Symptoms")).toBeOnTheScreen();
    return { pressBack };
  };

  it("closes", async () => {
    const { pressBack } = await openVisibilitySettings();

    await pressBack();

    expect(screen.queryByText("Symptoms")).not.toBeOnTheScreen();
  });

  it("closes an open info dialog first, then the modal", async () => {
    const { pressBack } = await openVisibilitySettings();
    await fireEvent.press(infoButton());
    expect(screen.getByText(/customize the visibility/)).toBeOnTheScreen();

    await pressBack();

    await waitFor(() =>
      expect(
        screen.queryByText(/customize the visibility/),
      ).not.toBeOnTheScreen(),
    );
    expect(screen.getByText("Symptoms")).toBeOnTheScreen();

    await pressBack();

    expect(screen.queryByText("Symptoms")).not.toBeOnTheScreen();
  });
});
