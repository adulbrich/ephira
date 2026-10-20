import { SettingsKeys, TRACKING_MODES } from "@/constants/Settings";
import { getSetting } from "@/db/database";
import {
  useData,
  useDatabaseChangeNotifier,
  usePredictedCycle,
  useSelectedDate,
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
 * them. Preferences (theme, filters) are left until the next launch reads
 * their defaults.
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

  // Read back, not assumed: a delete that rolled back kept the mode. A read
  // that fails falls back to the default rather than leave a spinner up.
  const mode = await getSetting(SettingsKeys.trackingMode).catch(
    () => undefined,
  );
  useTrackingMode
    .getState()
    .setTrackingMode(mode?.value ?? TRACKING_MODES.CYCLE);

  useDatabaseChangeNotifier.getState().setDatabaseChange(Date.now().toString());
}
