import { create } from "zustand";
import {
  Accordion,
  DayData,
  DayDataStore,
  LoadData,
  MarkedDates,
  Mood,
  Symptoms,
  Medications,
  BirthControl,
  BirthControlNotes,
  TimeTaken,
  TimePickerState,
  TempSelectedTime,
  FlowDataState,
  CalendarFilters,
  ThemeColor,
} from "@/constants/Interfaces";

const initialDay: DayData = {
  id: 0,
  date: "",
  flow_intensity: 0,
};

//creates DayDataStore interface to store the Selected Day Information
export const useSelectedDate = create<DayDataStore>((set) => ({
  ...initialDay,
  setData: (data: DayData) => {
    set(() => ({
      date: data.date,
      id: data.id,
      flow_intensity: data.flow_intensity,
      is_cycle_start: data.is_cycle_start,
      is_cycle_end: data.is_cycle_end,
      notes: data.notes,
    }));
  },
  setDate: (date: string) => {
    set(() => ({ date: date }));
  },
  setId: (num: number) => {
    set(() => ({ id: num }));
  },
  setFlow: (flow: number) => {
    set(() => ({ flow_intensity: flow }));
  },
  setNotes: (text: string) => {
    set(() => ({ notes: text }));
  },
  reset: () => set(initialDay),
}));

export const useMarkedDates = create<MarkedDates>((set) => ({}));

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

export const useMoods = create<Mood>((set) => ({
  selectedMoods: [],
  setSelectedMoods: (values: string[]) =>
    set(() => ({ selectedMoods: values })),
}));

export const useSymptoms = create<Symptoms>((set) => ({
  selectedSymptoms: [],
  setSelectedSymptoms: (values: string[]) =>
    set(() => ({ selectedSymptoms: values })),
}));

export const useMedications = create<Medications>((set) => ({
  selectedMedications: [],
  setSelectedMedications: (values: string[]) =>
    set(() => ({ selectedMedications: values })),
}));

export const useBirthControl = create<BirthControl>((set) => ({
  selectedBirthControl: null,
  setSelectedBirthControl: (value) =>
    set(() => ({ selectedBirthControl: value })),
}));

export const useBirthControlNotes = create<BirthControlNotes>((set) => ({
  birthControlNotes: "",
  setBirthControlNotes: (notes: string) =>
    set(() => ({ birthControlNotes: notes })),
}));

export const useTimeTaken = create<TimeTaken>((set) => ({
  timeTaken: "",
  setTimeTaken: (time: string) => set(() => ({ timeTaken: time })),
}));

export const useTimePickerState = create<TimePickerState>((set) => ({
  showTimePicker: false,
  setShowTimePicker: (show: boolean) => set(() => ({ showTimePicker: show })),
}));

export const useTempSelectedTime = create<TempSelectedTime>((set) => ({
  tempSelectedTime: null,
  setTempSelectedTime: (time: Date | null) =>
    set(() => ({ tempSelectedTime: time })),
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
