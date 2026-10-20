import { SettingsKeys, TRACKING_MODES } from "@/constants/Settings";
import { getSetting } from "@/db/database";
import {
  loadCalendarFilters,
  loadCyclePredictionChoice,
} from "@/db/preferences";
import {
  useCalendarFilters,
  useData,
  useDatabaseChangeNotifier,
  usePredictedCycle,
  usePredictionChoice,
  useSelectedDate,
  useThemeColor,
  useTrackingMode,
} from "@/stores/calendar-storage";
import {
  useContractionTimerStore,
  usePregnancyAppointments,
  usePregnancySelectedDate,
} from "@/stores/pregnancy-storage";

/**
 * Empties what the stores drew from the data Delete Data has deleted, or may
 * have: the database goes last, and can be empty when an earlier step failed.
 * The stores outlive every screen, so remounting the screens does not reach
 * them. Preferences are read back as a launch reads them: left as they were,
 * Settings would write them whole into the emptied table on the next change,
 * and a calendar filter can name a custom symptom.
 */
export async function forgetDeletedData() {
  useSelectedDate.getState().setDate("");
  useData.getState().setData([]);
  usePredictedCycle.getState().setPredictedCycle([]);
  usePredictedCycle.getState().setPredictedMarkedDates({});

  const pregnancyDay = usePregnancySelectedDate.getState();
  pregnancyDay.setDate("");
  pregnancyDay.setKicks(0);
  pregnancyDay.setSymptoms([]);
  pregnancyDay.setMoods([]);
  pregnancyDay.setNotes("");
  usePregnancyAppointments.getState().setAppointments([]);
  useContractionTimerStore.setState({
    isRunning: false,
    startAt: null,
    lastDurationMs: null,
  });

  // Read back, not assumed: a delete that rolled back kept them. A read that
  // fails falls back to the default rather than leave a spinner up.
  const [mode, theme, predictionChoice, calendarFilters] = await Promise.all([
    getSetting(SettingsKeys.trackingMode).catch(() => undefined),
    getSetting("theme").catch(() => undefined),
    loadCyclePredictionChoice(),
    loadCalendarFilters(),
  ]);
  useTrackingMode
    .getState()
    .setTrackingMode(mode?.value ?? TRACKING_MODES.CYCLE);
  useThemeColor.getState().setThemeColor(theme?.value || "purple");
  usePredictionChoice.getState().setPredictionChoice(predictionChoice);
  useCalendarFilters.getState().setSelectedFilters(calendarFilters);

  useDatabaseChangeNotifier.getState().setDatabaseChange(Date.now().toString());
}
