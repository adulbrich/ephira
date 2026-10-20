/**
 * Leaving pregnancy setup (#311). It renders the pregnancy home screen, not
 * the dialog alone, because the screen decides what Cancel and Back do; a
 * test under `app/` would be a route.
 */
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import { PaperProvider } from "react-native-paper";
import PregnancyHome from "@/app/(pregnancy-tabs)/index";
import { SettingsKeys, TRACKING_MODES } from "@/constants/Settings";
import { updateSetting } from "@/db/database";
import { savePregnancyAnchor } from "@/db/pregnancyAnchor";
import { loadTrackingMode } from "@/db/preferences";
import { useTrackingMode } from "@/stores/calendar-storage";
import { recordBackPresses } from "@/__tests__/helpers/backHandler";
import { resetTestDatabase } from "@/__tests__/helpers/testDatabase";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  router: { replace: jest.fn() },
}));
// Reanimated needs its native worklets runtime, which Jest does not have.
jest.mock(
  "@/components/animations/FadeInView",
  () => jest.requireActual("react-native").View,
);

const TITLE = "Set up Pregnancy Progress";

beforeEach(async () => {
  resetTestDatabase();
  jest.mocked(router.replace).mockClear();
  // Where TrackingModeSettings leaves things after a switch to pregnancy.
  await updateSetting(SettingsKeys.trackingMode, TRACKING_MODES.PREGNANCY);
  useTrackingMode.getState().setTrackingMode(TRACKING_MODES.PREGNANCY);
});
afterEach(() => jest.restoreAllMocks());

const renderPregnancyHome = async () => {
  const pressBack = recordBackPresses();
  await render(<PregnancyHome />, { wrapper: PaperProvider });
  await screen.findByText("Edit Pregnancy Start");
  return { pressBack };
};

// The mode app/index.tsx opens on the next launch is the stored one.
const expectBackInCycleMode = async () => {
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/(tabs)"));
  expect(await loadTrackingMode()).toBe(TRACKING_MODES.CYCLE);
  expect(useTrackingMode.getState().trackingMode).toBe(TRACKING_MODES.CYCLE);
};

describe("Pregnancy setup with no start date", () => {
  it("returns to cycle tracking on Cancel", async () => {
    await renderPregnancyHome();
    expect(screen.getByText(TITLE)).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Cancel"));

    await expectBackInCycleMode();
  });

  it("returns to cycle tracking on hardware Back", async () => {
    const { pressBack } = await renderPregnancyHome();
    expect(screen.getByText(TITLE)).toBeOnTheScreen();

    await pressBack();

    await expectBackInCycleMode();
  });
});

describe("Pregnancy setup with a start date", () => {
  it("closes on hardware Back and stays in pregnancy mode", async () => {
    await savePregnancyAnchor({
      startDateIso: "2026-08-01",
      gestationOffsetDays: 14,
    });
    const { pressBack } = await renderPregnancyHome();
    // A start date means the dialog opens only from Edit Pregnancy Start.
    expect(screen.queryByText(TITLE)).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Edit Pregnancy Start"));
    expect(screen.getByText(TITLE)).toBeOnTheScreen();

    await pressBack();

    await waitFor(() =>
      expect(screen.queryByText(TITLE)).not.toBeOnTheScreen(),
    );
    expect(router.replace).not.toHaveBeenCalled();
    expect(await loadTrackingMode()).toBe(TRACKING_MODES.PREGNANCY);
  });
});
