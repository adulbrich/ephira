import { create } from "zustand";
import type { PregnancyAppointment } from "@/db/schema";

interface PregnancySelectedDate {
  date: string;
  kicks: number;
  symptoms: string[];
  moods: string[];
  notes: string;
  setDate: (date: string) => void;
  setKicks: (kicks: number) => void;
  setSymptoms: (symptoms: string[]) => void;
  setMoods: (moods: string[]) => void;
  setNotes: (notes: string) => void;
}

interface PregnancyCalendarFilters {
  selectedFilters: string[];
  setSelectedFilters: (filters: string[]) => void;
}

interface PregnancyAppointmentsState {
  appointments: PregnancyAppointment[];
  setAppointments: (appointments: PregnancyAppointment[]) => void;
}

export const usePregnancySelectedDate = create<PregnancySelectedDate>(
  (set) => ({
    date: "",
    kicks: 0,
    symptoms: [],
    moods: [],
    notes: "",
    setDate: (date) => set({ date }),
    setKicks: (kicks) => set({ kicks }),
    setSymptoms: (symptoms) => set({ symptoms }),
    setMoods: (moods) => set({ moods }),
    setNotes: (notes) => set({ notes }),
  }),
);

export const usePregnancyCalendarFilters = create<PregnancyCalendarFilters>(
  (set) => ({
    selectedFilters: [],
    setSelectedFilters: (selectedFilters) => set({ selectedFilters }),
  }),
);

export const usePregnancyAppointments = create<PregnancyAppointmentsState>(
  (set) => ({
    appointments: [],
    setAppointments: (appointments) => set({ appointments }),
  }),
);

interface ContractionTimerState {
  isRunning: boolean;
  startAt: number | null;
  lastDurationMs: number | null;
  startTimer: () => void;
  stopTimer: () => void;
}

/** Persists across pregnancy tab navigation while the app session is active. */
export const useContractionTimerStore = create<ContractionTimerState>(
  (set, get) => ({
    isRunning: false,
    startAt: null,
    lastDurationMs: null,
    startTimer: () =>
      set({ isRunning: true, startAt: Date.now(), lastDurationMs: null }),
    stopTimer: () => {
      const { startAt } = get();
      const elapsed = startAt ? Date.now() - startAt : 0;
      set({ isRunning: false, startAt: null, lastDurationMs: elapsed });
    },
  }),
);
