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
