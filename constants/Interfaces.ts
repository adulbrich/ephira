export interface DayData {
  id: number
  date: string
  flow_intensity: number
  is_cycle_start?: boolean
  is_cycle_end?: boolean
  notes?: string
}
