export interface DayData {
  id: number;
  date: string;
  flow_intensity: number;
  is_cycle_start?: boolean;
  is_cycle_end?: boolean;
  notes?: string;
  moods?: string[];
  symptoms?: string[];
  medications?: string[];
  birth_control?: string;
}

export interface periodData {
  startingDay?: boolean;
  endingDay?: boolean;
  color: string;
}

export interface MarkedDate {
  selected: boolean;
  periods: periodData[];
}

export interface MarkedDates {
  [key: string]: MarkedDate;
}

export interface DayDataStore extends DayData {
  setData: (data: DayData) => void;
  setDate: (date: string) => void;
  setId: (num: number) => void;
  setFlow: (flow: number) => void;
  setNotes: (text: string) => void;
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

export interface Medications {
  selectedMedications: string[];
  setSelectedMedications: (values: string[]) => void;
}

export interface BirthControl {
  selectedBirthControl: string | null;
  setSelectedBirthControl: (value: string | null) => void;
}

export interface BirthControlNotes {
  birthControlNotes: string;
  setBirthControlNotes: (notes: string) => void;
}

export interface TimeTaken {
  timeTaken: string;
  setTimeTaken: (time: string) => void;
}

export interface TimePickerState {
  showTimePicker: boolean;
  setShowTimePicker: (show: boolean) => void;
}

export interface TempSelectedTime {
  tempSelectedTime: Date | null;
  setTempSelectedTime: (time: Date | null) => void;
}

export interface FlowDataState {
  flowDataForCurrentMonth: DayData[];
  setFlowDataForCurrentMonth: (data: DayData[]) => void;
}

export interface CalendarFilter {
  label: string;
  value: string;
}

export interface CalendarFilters {
  selectedFilters: CalendarFilter[];
  setSelectedFilters: (values: CalendarFilter[]) => void;
}
