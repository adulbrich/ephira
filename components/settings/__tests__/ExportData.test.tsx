import { fireEvent, render, screen } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import ExportData from "@/components/settings/ExportData";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

describe("Export Data", () => {
  it.each(["CSV", "PDF", "JSON"])(
    "says under %s that pregnancy data goes into the file",
    async (format) => {
      // An export made in cycle mode carries pregnancy days and appointments
      // too, which cycle mode never shows. The user picks where the file goes,
      // so the modal says what is in it before they do.
      await render(
        <PaperProvider>
          <ExportData />
        </PaperProvider>,
      );
      await fireEvent.press(screen.getByText("Export Data"));
      await fireEvent.press(screen.getByText(format));

      expect(
        screen.getByText(
          /also includes any pregnancy days and appointments, whichever tracking mode is on\.$/,
        ),
      ).toBeTruthy();
    },
  );
});
