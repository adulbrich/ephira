import { create } from "zustand";
import {
  Accordion,
  DayData,
  SelectedDateStore,
  LoadData,
  MarkedDates,
  FlowDataState,
  CalendarFilters,
  ThemeColor,
  DatabaseChangeNotifier,
  PredictionToggle,
  PredictedCycleState,
  PredictedDate,
  TrackingMode,
} from "@/constants/Interfaces";

/**
 * The selected date. Its only writer is the calendar's day press.
 *
 * It used to carry the whole selected day: flow, notes, cycle markers and an
 * id nothing read. Those are the contents of a Logged Day, which db/loggedDay.ts
 * owns; keeping them here meant every reader re-rendered when any of them moved.
 */
export const useSelectedDate = create<SelectedDateStore>((set) => ({
  date: "",
  setDate: (date: string) => set(() => ({ date })),
}));

export const useData = create<LoadData>((set) => ({
  data: [],
  show: false,
  setData: (data: DayData[]) => {
    set(() => ({ data: data }));
  },
  setShow: (show: boolean) => {
    set(() => ({ show: show }));
  },
}));

const initialString = null;

export const useAccordion = create<Accordion>((set) => ({
  state: initialString,
  setExpandedAccordion: (data: string | null) => set(() => ({ state: data })),
}));

export const useFlowData = create<FlowDataState>((set) => ({
  flowDataForCurrentMonth: [],
  setFlowDataForCurrentMonth: (data: DayData[]) =>
    set(() => ({ flowDataForCurrentMonth: data })),
}));

export const useCalendarFilters = create<CalendarFilters>((set) => ({
  selectedFilters: [],
  setSelectedFilters: (values: string[]) =>
    set(() => ({ selectedFilters: values })),
}));

export const useThemeColor = create<ThemeColor>((set) => ({
  themeColor: "",
  setThemeColor: (color: string) => set(() => ({ themeColor: color })),
}));

export const useDatabaseChangeNotifier = create<DatabaseChangeNotifier>(
  (set) => ({
    databaseChange: "",
    setDatabaseChange: (databaseChange: string) =>
      set(() => ({ databaseChange: databaseChange })),
  }),
);

export const usePredictionChoice = create<PredictionToggle>((set) => ({
  predictionChoice: false,
  setPredictionChoice: (predictionChoice: boolean) =>
    set(() => ({ predictionChoice: predictionChoice })),
}));

export const usePredictedCycle = create<PredictedCycleState>((set) => ({
  predictedCycle: [],
  predictedMarkedDates: {},
  setPredictedCycle: (data: PredictedDate[]) =>
    set(() => ({ predictedCycle: data })),
  setPredictedMarkedDates: (data: MarkedDates) =>
    set(() => ({ predictedMarkedDates: data })),
}));

export const useTrackingMode = create<TrackingMode>((set) => ({
  trackingMode: "cycle",
  setTrackingMode: (mode: string) => set(() => ({ trackingMode: mode })),
}));
