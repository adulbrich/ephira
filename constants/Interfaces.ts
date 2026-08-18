export interface DayData {
  id: number;
  date: string;
  flow_intensity: number;
  is_cycle_start?: boolean;
  is_cycle_end?: boolean;
  intercourse?: boolean | null;
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
  hasBirthControl?: boolean;
  hasIntercourse?: boolean;
}

export interface MarkedDates {
  [key: string]: MarkedDate;
}

/**
 * The selected date, and nothing else.
 *
 * The date is genuinely shared: the calendar picks it and the day view reads
 * it. The selected day's *contents* were only ever global so that accordions
 * and fetch hooks could talk past each other, which db/loggedDay.ts absorbed.
 */
export interface SelectedDateStore {
  date: string;
  setDate: (date: string) => void;
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

export interface CurrentCycleState {
  currentPhase: "menstrual" | "follicular" | "ovulation" | "luteal";
  cycleDay: number;
  cycleLength: number;
  daysUntilNextPeriod: number;
  lastPeriodStart: string | null;
  nextPredictedStart: string | null;
  confidence: number;
  hasEnoughData: boolean;
}

export interface TrackingMode {
  trackingMode: string;
  setTrackingMode: (mode: string) => void;
}

export interface CycleStats {
  averageCycleLength: number;
  cycleVariation: number;
  totalCyclesTracked: number;
  predictionAccuracy: number;
  isRegular: boolean;
}
