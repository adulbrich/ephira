import { create } from "zustand";
import {
  Accordion,
  DayData,
  DayDataStore,
  LoadData,
  MarkedDates,
  Mood,
  Symptoms,
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
