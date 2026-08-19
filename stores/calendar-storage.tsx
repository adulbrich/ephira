import { create } from "zustand";
import type {
  DayData,
  MarkedDates,
  PredictedDate,
} from "@/constants/Interfaces";

/**
 * Cycle-mode app state. `stores/pregnancy-storage.tsx` is its counterpart.
 *
 * Each store's shape is declared here, beside the store, and is not exported.
 * A shape with no reader outside its own store should not be importable: it
 * describes how this file holds something, not a thing the app has. The types
 * that cross the boundary are the domain and view types in
 * `constants/Interfaces.ts`, which the shapes below reference.
 */

/**
 * The selected date. Its only writer is the calendar's day press.
 *
 * It used to carry the whole selected day: flow, notes, cycle markers and an
 * id nothing read. Those are the contents of a Logged Day, which db/loggedDay.ts
 * owns; keeping them here meant every reader re-rendered when any of them moved.
 */
interface SelectedDateStore {
  date: string;
  setDate: (date: string) => void;
}

export const useSelectedDate = create<SelectedDateStore>((set) => ({
  date: "",
  setDate: (date: string) => set(() => ({ date })),
}));

interface LoadData {
  data: DayData[];
  show: boolean;
  setData: (data: DayData[]) => void;
  setShow: (show: boolean) => void;
}

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

interface FlowDataState {
  flowDataForCurrentMonth: DayData[];
  setFlowDataForCurrentMonth: (data: DayData[]) => void;
}

export const useFlowData = create<FlowDataState>((set) => ({
  flowDataForCurrentMonth: [],
  setFlowDataForCurrentMonth: (data: DayData[]) =>
    set(() => ({ flowDataForCurrentMonth: data })),
}));

interface CalendarFilters {
  selectedFilters: string[];
  setSelectedFilters: (values: string[]) => void;
}

export const useCalendarFilters = create<CalendarFilters>((set) => ({
  selectedFilters: [],
  setSelectedFilters: (values: string[]) =>
    set(() => ({ selectedFilters: values })),
}));

interface ThemeColor {
  themeColor: string;
  setThemeColor: (color: string) => void;
}

export const useThemeColor = create<ThemeColor>((set) => ({
  themeColor: "",
  setThemeColor: (color: string) => set(() => ({ themeColor: color })),
}));

interface DatabaseChangeNotifier {
  databaseChange: string;
  setDatabaseChange: (databaseChange: string) => void;
}

export const useDatabaseChangeNotifier = create<DatabaseChangeNotifier>(
  (set) => ({
    databaseChange: "",
    setDatabaseChange: (databaseChange: string) =>
      set(() => ({ databaseChange: databaseChange })),
  }),
);

interface PredictionToggle {
  predictionChoice: boolean;
  setPredictionChoice: (predictionChoice: boolean) => void;
}

export const usePredictionChoice = create<PredictionToggle>((set) => ({
  predictionChoice: false,
  setPredictionChoice: (predictionChoice: boolean) =>
    set(() => ({ predictionChoice: predictionChoice })),
}));

interface PredictedCycleState {
  predictedCycle: PredictedDate[];
  predictedMarkedDates: MarkedDates;
  setPredictedCycle: (data: PredictedDate[]) => void;
  setPredictedMarkedDates: (data: MarkedDates) => void;
}

export const usePredictedCycle = create<PredictedCycleState>((set) => ({
  predictedCycle: [],
  predictedMarkedDates: {},
  setPredictedCycle: (data: PredictedDate[]) =>
    set(() => ({ predictedCycle: data })),
  setPredictedMarkedDates: (data: MarkedDates) =>
    set(() => ({ predictedMarkedDates: data })),
}));

interface TrackingMode {
  trackingMode: string;
  setTrackingMode: (mode: string) => void;
}

export const useTrackingMode = create<TrackingMode>((set) => ({
  trackingMode: "cycle",
  setTrackingMode: (mode: string) => set(() => ({ trackingMode: mode })),
}));
