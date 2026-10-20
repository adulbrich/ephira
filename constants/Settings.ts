export const SettingsKeys = {
  authentication: "authentication",
  password: "password",
  calendarFilters: "calendarFilters",
  databaseInitialSetup: "databaseInitialSetup",
  cyclePredictions: "cyclePredictions",
  notificationsEnabled: "notificationsEnabled",
  notificationSettings: "notificationSettings",
  activeBirthControlType: "activeBirthControlType",
  trackingMode: "trackingMode",
  pregnancyCalendarFilters: "pregnancyCalendarFilters",
  pregnancyStartDate: "pregnancyStartDate",
  pregnancyGestationOffsetDays: "pregnancyGestationOffsetDays",
  theme: "theme",
};

export const TRACKING_MODES = {
  CYCLE: "cycle",
  PREGNANCY: "pregnancy",
} as const;

export type TrackingModeType =
  (typeof TRACKING_MODES)[keyof typeof TRACKING_MODES];

export const AUTH_TYPES = {
  NONE: "none",
  BIOMETRIC: "biometric",
  PASSWORD: "password",
};
