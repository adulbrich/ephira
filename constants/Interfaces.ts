export interface DayData {
  id: number;
  date: string;
  flow_intensity: number;
  is_cycle_start?: boolean;
  is_cycle_end?: boolean;
  notes?: string;
}

export interface MarkedDate {
  marked: boolean;
  selected: boolean;
  dotColor: string;
}

export interface MarkedDates {
  [key: string]: MarkedDate;
}

export interface DayDataStore extends DayData {
  setData: (data: DayData) => void;
  setDate: (date: string) => void;
  setId: (num: number) => void;
  setFlow: (flow: number) => void;
  reset: () => void;
}

export interface LoadData {
  data: DayData[];
  show: boolean;
  setData: (data: DayData[]) => void;
  setShow: (show: boolean) => void;
}

export interface Accordion {
  state: string | null;
  setExpandedAccordion: (state: string | null) => void;
}

export interface Mood {
  selectedMoods: string[];
  setSelectedMoods: (values: string[]) => void;
}

export interface Symptoms {
  selectedSymptoms: string[];
  setSelectedSymptoms: (values: string[]) => void;
}

