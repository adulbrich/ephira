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
  flow_intensity: number | null;
  is_cycle_start?: boolean | null;
  is_cycle_end?: boolean | null;
  intercourse?: boolean | null;
  notes?: string | null;
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
  /**
   * Optional, because it is not part of how a date should be drawn from what
   * was logged. The calendar screen applies it at render, where the Selected
   * Date and the theme colours it needs both live. See CONTEXT.md.
   */
  selected?: boolean;
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

/** What pregnancy mode logged for one date, from `pregnancy_days`. */
export interface ExportPregnancyDay {
  /**
   * Absent when the column is null. The day view saves its counter, which
   * starts at 0, so 0 is also what a day where nobody counted kicks holds.
   */
  kicks?: number;
  symptoms: string[];
  moods: string[];
  notes?: string;
}

/** One row of `pregnancy_appointments`. Its date is the key it is filed under. */
export interface ExportAppointment {
  title: string;
  type?: string;
  notes?: string;
}

export interface ExportData {
  headers: ExportDataHeaders;
  /** Cycle Days, keyed by date. */
  dailyData: Record<string, ExportDayEntry>;
  /**
   * Pregnancy mode's days, keyed by date. Kept apart from `dailyData` because
   * the two are different tables with different fields (docs/adr/0001); the
   * formats decide how to lay them side by side.
   */
  pregnancyDays: Record<string, ExportPregnancyDay>;
  /** Appointments keyed by date, oldest first within a date. */
  pregnancyAppointments: Record<string, ExportAppointment[]>;
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
