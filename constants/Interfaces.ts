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
  height?: number;
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
  setCycleStart: (start: boolean) => void;
  setCycleEnd: (end: boolean) => void;
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

export interface CalendarFilters {
  selectedFilters: string[];
  setSelectedFilters: (values: string[]) => void;
}

export interface ThemeColor {
  themeColor: string;
  setThemeColor: (color: string) => void;
}

export interface DatabaseChangeNotifier {
  databaseChange: string;
  setDatabaseChange: (databaseChange: string) => void;
}

export interface ExportDataHeaders {
  base_header: string[];
  moods: string[];
  symptoms: string[];
  medications: string[];
  birth_control: string[];
}

export interface ExportDayEntry {
  date: string;
  flow_intensity: number;
  notes?: string;
  moods: string[];
  symptoms: string[];
  medications: {
    name: string;
    time_taken?: string;
    notes?: string;
  }[];
  birth_control: {
    name: string;
    time_taken?: string;
    notes?: string;
  }[];
}

export interface ExportData {
  headers: ExportDataHeaders;
  dailyData: Record<string, ExportDayEntry>;
}

export interface PredictionToggle {
  predictionChoice: boolean;
  setPredictionChoice: (predictionChoice: boolean) => void;
}

export interface PredictedDate {
  date: string;
  confidence: number; // 0-100
}

export interface PredictedCycleState {
  predictedCycle: PredictedDate[];
  predictedMarkedDates: MarkedDates;
  setPredictedCycle: (data: PredictedDate[]) => void;
  setPredictedMarkedDates: (data: MarkedDates) => void;
}
