import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { Alert } from "react-native";
import { PaperProvider } from "react-native-paper";
import DeleteData from "@/components/settings/DeleteData";

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

beforeEach(() => {
  mockDeleteAllAppData.mockReset();
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

  it("says so when it is not, and lets the user try again", async () => {
    mockDeleteAllAppData.mockRejectedValue(new Error("disk I/O error"));

    const modal = await confirmDelete();

    expect(Alert.alert).toHaveBeenCalledWith(
      "Data not deleted",
      expect.stringContaining("Try again"),
    );
    expect(Alert.alert).not.toHaveBeenCalledWith(
      "Data deleted",
      expect.anything(),
    );
    expect(modal.getByRole("button", { name: "Delete Data" })).toBeEnabled();
  });
});
