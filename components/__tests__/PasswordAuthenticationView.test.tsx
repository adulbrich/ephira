import { fireEvent, render, screen } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import PasswordAuthenticationView from "@/components/PasswordAuthenticationView";
import {
  DATABASE_STEP,
  DeletionIncomplete,
} from "@/services/deletionIncomplete";
import { usePregnancySelectedDate } from "@/stores/pregnancy-storage";
import { resetTestDatabase } from "@/__tests__/helpers/testDatabase";

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
    { wrapper: PaperProvider },
  );
  await fireEvent.press(screen.getByText("Forgot Password"));
  await fireEvent.press(screen.getByText("Reset Password"));
}

beforeEach(() => {
  resetTestDatabase();
  mockDeleteAllAppData.mockReset();
});

describe("Forgot Password reset", () => {
  it("asks for a restart once the data is gone", async () => {
    mockDeleteAllAppData.mockResolvedValue(undefined);

    await resetPassword();

    expect(
      screen.getByText(/Data and password have been deleted/),
    ).toBeOnTheScreen();
  });

  it("has the stores let go of what they drew from the data", async () => {
    // A trip to the background unlocks once the lock is gone, and the screens
    // that mount then would start from what the stores still hold.
    mockDeleteAllAppData.mockResolvedValue(undefined);
    usePregnancySelectedDate.getState().setNotes("first kicks");

    await resetPassword();

    expect(usePregnancySelectedDate.getState().notes).toBe("");
  });

  it("leaves the stores alone, and says so, when the database kept everything", async () => {
    mockDeleteAllAppData.mockRejectedValue(
      new DeletionIncomplete([DATABASE_STEP]),
    );
    usePregnancySelectedDate.getState().setNotes("first kicks");

    await resetPassword();

    expect(usePregnancySelectedDate.getState().notes).toBe("first kicks");
    expect(
      screen.getByText("Not all data could be deleted. Try again."),
    ).toBeOnTheScreen();
  });

  it.each([
    ["another step failed", new DeletionIncomplete(["csv export"])],
    ["the failure does not say what it left", new Error("unexpected")],
  ])(
    "has the stores let go when the database may be gone: %s",
    async (_case, failure) => {
      mockDeleteAllAppData.mockRejectedValue(failure);
      usePregnancySelectedDate.getState().setNotes("first kicks");

      await resetPassword();

      expect(usePregnancySelectedDate.getState().notes).toBe("");
    },
  );

  it("says so when the data is not gone, and tries again on request", async () => {
    mockDeleteAllAppData.mockRejectedValueOnce(new Error("disk I/O error"));

    await resetPassword();

    expect(screen.queryByText(/have been deleted/)).not.toBeOnTheScreen();
    expect(
      screen.getByText("Not all data could be deleted. Try again."),
    ).toBeOnTheScreen();

    mockDeleteAllAppData.mockResolvedValueOnce(undefined);
    await fireEvent.press(screen.getByText("Try Again"));

    expect(mockDeleteAllAppData).toHaveBeenCalledTimes(2);
    expect(
      screen.getByText(/Data and password have been deleted/),
    ).toBeOnTheScreen();
  });

  it("offers no second try while one is running", async () => {
    mockDeleteAllAppData.mockRejectedValueOnce(new Error("disk I/O error"));
    await resetPassword();

    let finish = () => {};
    mockDeleteAllAppData.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    // Not awaited: React Native Testing Library would wait for the retry.
    // One macrotask lets React commit the loading state inside that press.
    const pressing = fireEvent.press(screen.getByText("Try Again"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByText("Try Again")).not.toBeOnTheScreen();
    finish();
    await pressing;
  });
});
