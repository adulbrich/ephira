import { getAllDays } from "@/db/database";
import { usePredictedCycle } from "@/assets/src/calendar-storage";
import { DayData } from "@/constants/Interfaces";

export function useFetchCycleData() {
  const { predictedCycle, setPredictedCycle } = usePredictedCycle();
  const predictedDates: string[] = [];

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

    const CycleStartDays = sortedFlowDays.filter(
      (day) => day.is_cycle_start === true,
    );
    const CycleEndDays = sortedFlowDays.filter(
      (day) => day.is_cycle_end === true,
    );
    // console.log(CycleStartDays)
    // console.log(CycleEndDays)

    const endDateData = CycleEndDays.pop();
    const startDateData = CycleStartDays.pop();

    if (endDateData && startDateData) {
      const endDate = new Date(`${endDateData.date}`);
      const startDate = new Date(`${startDateData.date}`);
      const viable = endDate.valueOf() > startDate.valueOf() ? true : false;
      //console.log("Last logged start date is before the last logged end date: ", viable)

      if (viable === true) {
        const predictedStart = new Date(startDate);
        predictedStart.setDate(startDate.getDate() + 21);
        const predictedEnd = new Date(endDate);
        predictedEnd.setDate(endDate.getDate() + 21);
        const nextPredictedDate = new Date(predictedStart);
        while (nextPredictedDate.valueOf() <= predictedEnd.valueOf()) {
          predictedDates.push(nextPredictedDate.toDateString());
          nextPredictedDate.setDate(nextPredictedDate.getDate() + 1);
        }
      }
    }

    setPredictedCycle(predictedDates);
    // console.log(predictedDates)
    // console.log(predictedCycle)
  };

  return { fetchCycleData };
}
