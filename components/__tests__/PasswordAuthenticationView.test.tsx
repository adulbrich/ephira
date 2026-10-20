import { fireEvent, render, screen } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import PasswordAuthenticationView from "@/components/PasswordAuthenticationView";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

const mockDeleteAllAppData = jest.fn();
jest.mock("@/services/deleteAllAppData", () => ({
  deleteAllAppData: () => mockDeleteAllAppData(),
}));

async function resetPassword() {
  await render(
    <PasswordAuthenticationView handlePasswordSubmit={jest.fn()} />,
    {
      wrapper: PaperProvider,
    },
  );
  await fireEvent.press(screen.getByText("Forgot Password"));
  await fireEvent.press(screen.getByText("Reset Password"));
}

beforeEach(() => mockDeleteAllAppData.mockReset());

describe("Forgot Password reset", () => {
  it("asks for a restart once the data is gone", async () => {
    mockDeleteAllAppData.mockResolvedValue(undefined);

    await resetPassword();

    expect(
      screen.getByText(/Data and password have been deleted/),
    ).toBeOnTheScreen();
  });

  it("says so when the data is not gone, and tries again on request", async () => {
    mockDeleteAllAppData.mockRejectedValueOnce(new Error("disk I/O error"));

    await resetPassword();

    expect(screen.queryByText(/have been deleted/)).not.toBeOnTheScreen();
    expect(screen.getByText(/could not be deleted/)).toBeOnTheScreen();

    mockDeleteAllAppData.mockResolvedValueOnce(undefined);
    await fireEvent.press(screen.getByText("Try Again"));

    expect(mockDeleteAllAppData).toHaveBeenCalledTimes(2);
    expect(
      screen.getByText(/Data and password have been deleted/),
    ).toBeOnTheScreen();
  });
});
