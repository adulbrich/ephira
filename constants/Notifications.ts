/**
 * Constants and configuration for notification system
 */

export const NotificationTypes = {
  PERIOD_UPCOMING: "period_upcoming",
  PERIOD_TODAY: "period_today",
  PERIOD_LATE: "period_late",
  LOW_DATA_QUALITY: "low_data_quality",
  PREDICTION_ACCURACY_UPDATE: "accuracy_update",
} as const;

export type NotificationType =
  (typeof NotificationTypes)[keyof typeof NotificationTypes];

export const NotificationDefaults = {
  /** Default days before period to send reminders */
  PERIOD_REMINDER_DAYS_BEFORE: [1, 3] as number[],

  /** Default time to send notifications (24-hour format) */
  NOTIFICATION_TIME: "08:00",

  /** Days after expected period to consider it "late" */
  LATE_PERIOD_THRESHOLD_DAYS: 3,

  /** Minimum confidence level to send notifications (0-100) */
  MIN_CONFIDENCE_FOR_NOTIFICATION: 50,

  /** Sound enabled by default */
  SOUND_ENABLED: true,
} as const;

export interface NotificationTemplate {
  title: string;
  body: string;
}

export const NotificationTemplates: Record<string, NotificationTemplate> = {
  period_upcoming_1_day: {
    title: "Period Expected Tomorrow",
    body: "Your next period is predicted to start tomorrow.",
  },
  period_upcoming_3_days: {
    title: "Period Coming Soon",
    body: "Your period is expected to start in 3 days.",
  },
  period_upcoming_7_days: {
    title: "Period Reminder",
    body: "Your period is expected to start in 1 week.",
  },
  period_today: {
    title: "Period Expected Today",
    body: "Your period is predicted to start today.",
  },
  period_late: {
    title: "Period Update",
    body: "Your period was expected a few days ago. Update your data if it has started.",
  },
  low_data_quality: {
    title: "Track Your Cycle",
    body: "Log more cycle data to improve prediction accuracy.",
  },
  accuracy_improved: {
    title: "Predictions Improving!",
    body: "Your prediction accuracy has reached {{percentage}}%.",
  },
  test_notification: {
    title: "Test Notification",
    body: "This is a test notification from Ephira.",
  },
};

/**
 * Get notification template with dynamic values replaced
 */
export const getNotificationTemplate = (
  templateKey: string,
  variables?: Record<string, string | number>,
): NotificationTemplate => {
  const template = NotificationTemplates[templateKey];

  if (!template) {
    return NotificationTemplates.test_notification;
  }

  if (!variables) {
    return template;
  }

  // Replace variables in the template
  let title = template.title;
  let body = template.body;

  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    title = title.replace(placeholder, String(value));
    body = body.replace(placeholder, String(value));
  });

  return { title, body };
};

/**
 * Notification settings interface
 */
export interface NotificationSettings {
  enabled: boolean;
  reminderDaysBefore: number[];
  notificationTime: string; // "HH:MM" format
  soundEnabled: boolean;
  minConfidence: number;
}

/**
 * Default notification settings
 */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  reminderDaysBefore: NotificationDefaults.PERIOD_REMINDER_DAYS_BEFORE,
  notificationTime: NotificationDefaults.NOTIFICATION_TIME,
  soundEnabled: NotificationDefaults.SOUND_ENABLED,
  minConfidence: NotificationDefaults.MIN_CONFIDENCE_FOR_NOTIFICATION,
};
