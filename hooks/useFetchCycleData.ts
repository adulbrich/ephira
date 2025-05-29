import { getAllDays } from "@/db/database";
import { DayData, MarkedDates } from "@/constants/Interfaces";
import { last } from "pdf-lib";

export function useFetchCycleData(
  setPredictedCycle: (values: string[]) => void,
) {
  const predictedDates: string[] = [];

    // get date in local time
    const day = new Date();
    const offset = day.getTimezoneOffset();
    const localDate = new Date(day.getTime() - offset * 60 * 1000);
    const today = localDate.toISOString().split("T")[0];

  const areConsecutive = (date1: string, date2: string): boolean => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return diffTime === 86400000; // 1 day in milliseconds
  };

  const renderCycles = (flowData: DayData[]) => {
    let lastDate: string | null = null;

    // Collect consecutive days and group them together
    const groupedDates: { dates: string[]; flowIntensities: number[] }[] = [];

    flowData.forEach((data) => {

      const flowIntensity = data.flow_intensity;

      if (lastDate && areConsecutive(lastDate, data.date)) {
        // If last date is consecutive, push this date and flow intensity to the group
        const lastGroup = groupedDates[groupedDates.length - 1];
        lastGroup.dates.push(data.date);
        lastGroup.flowIntensities.push(flowIntensity);
      } else if (!lastDate || !areConsecutive(lastDate, data.date)) {
        // Create a new group for non-consecutive days
        groupedDates.push({
          dates: [data.date],
          flowIntensities: [flowIntensity],
        });
      }

      lastDate = data.date;
    });

    return groupedDates

  }



  const fetchCycleData = async () => {
    const allDays = await getAllDays();
    const flowDays = allDays.filter((day) => day.flow_intensity);

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
    
    const cycles = renderCycles(sortedFlowDays);

    while (cycles.length > 0) {
      const lastCycle = cycles.pop();

      const lastCycleDates = lastCycle ? lastCycle.dates : [];

      if (lastCycleDates.length > 2) {
        const predictedStart = new Date(lastCycleDates[0]);
        predictedStart.setDate(predictedStart.getDate() + 28);
        const predictedEnd = new Date(lastCycleDates[lastCycleDates.length - 1]);
        predictedEnd.setDate(predictedEnd.getDate() + 28);
        const predictedDate = new Date(predictedEnd);
        while ((predictedDate.valueOf() >= predictedStart.valueOf()) && (predictedDate.valueOf() >= localDate.valueOf())) {
          predictedDate.setDate(predictedDate.getDate() - 1);
          predictedDates.push(predictedDate.toISOString().split("T")[0]);
        }
        break; 
      }
    }
    
    setPredictedCycle(predictedDates);

    return predictedDates;
  };

  return { fetchCycleData };
}
