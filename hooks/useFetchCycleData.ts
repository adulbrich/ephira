import { getAllDays } from "@/db/database";
import { DayData, MarkedDates } from "@/constants/Interfaces";

export function useFetchCycleData(
  setPredictedCycle: (values: string[]) => void,
  setPredictedMarkedDates: (values: MarkedDates) => void,
) {
  const predictedDates: string[] = [];

  const fetchCycleData = async () => {
    const allDays = await getAllDays();
    const flowDays = allDays.filter((day) => day.flow_intensity);

    const markedDates: MarkedDates = {};

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
        predictedStart.setDate(startDate.getDate() + 28);
        const predictedEnd = new Date(endDate);
        predictedEnd.setDate(endDate.getDate() + 28);
        const nextPredictedDate = new Date(predictedStart);
        while (nextPredictedDate.valueOf() <= predictedEnd.valueOf()) {
          nextPredictedDate.setDate(nextPredictedDate.getDate() + 1);
          predictedDates.push(nextPredictedDate.toISOString().split("T")[0]);
          // markedDates[nextPredictedDate.toISOString().split("T")[0]] = {
          //   selected: false,
          //   periods: [
          //     { startingDay: true, endingDay: true, color: "blue" },
          //   ]
          //   }
        }
      }
    }

    setPredictedCycle(predictedDates);
    setPredictedMarkedDates(markedDates);
    // console.log("predictedDates1")
    // console.log(predictedDates)
    // console.log("markedDates1")
    // console.log(markedDates)

    return predictedDates;
  };

  return { fetchCycleData };
}
