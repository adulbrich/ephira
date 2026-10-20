import {
  loadCalendarFilters,
  loadCyclePredictionChoice,
  loadThemeColor,
  loadTrackingMode,
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
 * Empties what the stores drew from the data Delete Data has deleted. Its
 * callers run it whenever the database step went through, which it does even
 * when another step failed. The stores outlive every screen, so remounting
 * the screens does not reach them. Preferences are read back as a launch reads them: left as they were,
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

  // Read back with the loaders a launch uses, which fall back to the default
  // on a failed read.
  const [mode, theme, predictionChoice, calendarFilters] = await Promise.all([
    loadTrackingMode(),
    loadThemeColor(),
    loadCyclePredictionChoice(),
    loadCalendarFilters(),
  ]);
  useTrackingMode.getState().setTrackingMode(mode);
  useThemeColor.getState().setThemeColor(theme);
  usePredictionChoice.getState().setPredictionChoice(predictionChoice);
  useCalendarFilters.getState().setSelectedFilters(calendarFilters);

  useDatabaseChangeNotifier.getState().setDatabaseChange(Date.now().toString());
}
