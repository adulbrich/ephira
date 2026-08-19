/**
 * The domain and view data types the app passes around.
 *
 * Zustand store shapes used to live here too, which made this one file because
 * everything in it was an `interface` and for no other reason. They are now
 * declared beside their store in `stores/calendar-storage.tsx`, un-exported,
 * matching `stores/pregnancy-storage.tsx`.
 */

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

export interface PeriodData {
  startingDay?: boolean;
  endingDay?: boolean;
  color: string;
  height?: number;
}

export interface MarkedDate {
  selected: boolean;
  periods: PeriodData[];
  hasBirthControl?: boolean;
  hasIntercourse?: boolean;
}

export interface MarkedDates {
  [key: string]: MarkedDate;
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

export interface PredictedDate {
  date: string;
  confidence: number; // 0-100
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

export interface CycleStats {
  averageCycleLength: number;
  cycleVariation: number;
  totalCyclesTracked: number;
  predictionAccuracy: number;
  isRegular: boolean;
}
