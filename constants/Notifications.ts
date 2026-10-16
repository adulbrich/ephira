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

/**
 * Where tapping a notification should send the user, or `null` to stay put.
 *
 * Takes the payload rather than the notification so it stays free of
 * expo-notifications and can be tested directly.
 *
 * `data` is optional because a notification can arrive without one, and its
 * values are `unknown` because nothing constrains what a sender puts there --
 * both of which SDK 55 made explicit in `NotificationContent`. The listener
 * this came from read `data.type` unguarded, which throws on the first
 * payload-less notification.
 */
export const routeForNotification = (
  data: Record<string, unknown> | undefined,
): "/(tabs)/calendar" | null => {
  const type = data?.type;
  if (typeof type !== "string") return null;

  const aboutAPeriod: string[] = [
    NotificationTypes.PERIOD_UPCOMING,
    NotificationTypes.PERIOD_TODAY,
    NotificationTypes.PERIOD_LATE,
  ];

  return aboutAPeriod.includes(type) ? "/(tabs)/calendar" : null;
};

/**
 * The part of an expo-notifications `NotificationResponse` that routing reads.
 * Structural, so this file stays free of expo-notifications.
 */
export interface TappedNotification {
  notification: {
    request: {
      identifier: string;
      content: { data?: Record<string, unknown> };
    };
  };
}

/**
 * Returns a `routeForNotification` that takes the whole response and answers
 * `null` for a tap it has already routed.
 *
 * Two paths see each tap: the response listener in `app/_layout.tsx`, and
 * `app/index.tsx` reading the last response when it mounts. The second exists
 * because a tap that launches the app reaches expo-notifications natively
 * before any JS listener is registered, so the listener never hears it. Index
 * also remounts on every return from the background, when the last response
 * may be a tap the listener already routed. Keying on the request identifier
 * lets both paths share one instance without either navigating twice.
 */
export const routeEachResponseOnce = () => {
  const routed = new Set<string>();

  return (response: TappedNotification | null) => {
    if (!response) return null;

    const { identifier, content } = response.notification.request;
    if (routed.has(identifier)) return null;
    routed.add(identifier);

    return routeForNotification(content.data);
  };
};
