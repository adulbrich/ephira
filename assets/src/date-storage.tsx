import {create} from 'zustand';

interface DayData {
    id: number;
    date: string;
    flow_intensity: number;
    is_cycle_start?: boolean;
    is_cycle_end?: boolean;
    notes?: string;
    setData: (data: DayData) => void;
    setDate: (day: string) => void;
  }

  export const useSelectedDate = create <DayData>(set => ({
    id: 0,
    date: "",
    flow_intensity: 0,
    setData: (data : DayData) => { set(() => 
        ({id: data.id, date: data.date, flow_intensity: data.flow_intensity}))
    },
    setDate: (day : string) => { set(() =>
        ({date: day}))
    }

  }))