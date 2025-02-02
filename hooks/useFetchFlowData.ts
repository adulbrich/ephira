import { getAllDays } from "@/db/database";
import { useData } from "@/assets/src/calendar-storage";
import { DayData } from "@/constants/Interfaces";

export function useFetchFlowData() {
  const { setData } = useData();

  const fetchFlowData = async () => {
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
    setData(sortedFlowDays);
  };
  return { fetchFlowData };
}
