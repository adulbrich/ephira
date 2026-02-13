import { getAllDays, savePredictions } from "@/db/database";
import { DayData, PredictedDate } from "@/constants/Interfaces";
import { generatePredictions } from "@/services/cyclePredictionLogic";
import { NotificationService } from "@/services/notificationService";

export function useFetchCycleData(
  setPredictedCycle: (values: PredictedDate[]) => void,
) {
  const fetchCycleData = async () => {
    try {
      const allDays = await getAllDays();
      const flowDays = allDays.filter((day) => day.flow_intensity);

      if (flowDays.length === 0) {
        setPredictedCycle([]);
        return [];
      }

      const sortedFlowDays: DayData[] = flowDays
        .map((day) => ({
          ...day,
          flow_intensity: day.flow_intensity ?? 0,
          is_cycle_start: day.is_cycle_start ?? undefined,
          is_cycle_end: day.is_cycle_end ?? undefined,
          notes: day.notes ?? undefined,
        }))
        .sort((a, b) => {
          const dateA = new Date(`${a.date}`).valueOf();
          const dateB = new Date(`${b.date}`).valueOf();
          return dateA > dateB ? 1 : -1;
        });

      const day = new Date();
      const offset = day.getTimezoneOffset();
      const localDate = new Date(day.getTime() - offset * 60 * 1000);

      const predictedDates = generatePredictions(sortedFlowDays, {
        referenceDate: localDate,
      });

      setPredictedCycle(predictedDates);

      if (predictedDates.length > 0) {
        try {
          await savePredictions(predictedDates);
          await NotificationService.scheduleAllPredictionNotifications(
            predictedDates,
          );
        } catch (saveError) {
          console.error("Error saving predictions:", saveError);
        }
      }

      return predictedDates;
    } catch (error) {
      console.error("Error fetching cycle data:", error);
      setPredictedCycle([]);
      return [];
    }
  };

  return { fetchCycleData };
}
