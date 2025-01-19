import {create} from 'zustand';
import {DayData, MarkedDates} from '@/constants/Interfaces'
import { getAllDays } from '@/db/operations/days';

export interface DayDataStore extends DayData{
  setData: (data: DayData) => void;
  setDate: (date: string) => void;
  setId: (num : number) => void;
  setFlow: (flow: number) => void;
  reset: () => void;
}

const initialDay : DayData = {
  id: 0,
  date: "",
  flow_intensity: 0, 
}

export interface LoadData{
  data : DayData[],
  show: boolean,
  setData: (data: DayData[]) => void;
  setShow: (show: boolean) => void;
}



export const useSelectedDate = create <DayDataStore>((set) => ({
    ...initialDay,
    setData: (data : DayData) => { set(() => 
        ({date : data.date, id: data.id, flow_intensity: data.flow_intensity, is_cycle_start: data.is_cycle_start, is_cycle_end: data.is_cycle_end, notes: data.notes}))
    },
    setDate: (date : string) => { set(() =>
        ({date : date}))
    },
    setId: (num : number) => { set(() =>
      ({id: num}))
    },
    setFlow: (flow: number) => { set(() =>
    ({flow_intensity: flow}))
    },
    reset: () => set(initialDay)
  }))

export const useMarkedDates = create <MarkedDates>((set) => ({}))

export const useData = create<LoadData>((set) => ({
  data: [],
  show: false,
  setData: (data : DayData[]) => { set(() => 
    ({data : data}))
  },
  setShow: (show : boolean) => { set(() => 
    ({show : show}))
  }
}))