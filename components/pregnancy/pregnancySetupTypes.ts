export type SetupMethod = "dueDate" | "weeksPregnant" | "lastPeriod" | "notSure";

export type NotSurePath =
  | "doctorDueDate"
  | "ultrasoundEstimate"
  | "lastPeriod"
  | "conceptionDate";

export type DateFieldKey =
  | "dueDate"
  | "lastPeriod"
  | "conceptionDate"
  | "positiveTestDate";
