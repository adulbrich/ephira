export interface DayData {
  id: number;
  date: string;
  flow_intensity: number;
}

export interface MarkedDate {
  marked: boolean;
  selected: boolean;
  dotColor: string;
}

export interface MarkedDates {
  [key: string]: MarkedDate;
}
