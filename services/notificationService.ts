import * as Notifications from "expo-notifications";
import { PredictedDate } from "@/constants/Interfaces";
import {
  NotificationSettings,
  NotificationTypes,
  getNotificationTemplate,
  DEFAULT_NOTIFICATION_SETTINGS,
} from "@/constants/Notifications";
import { SettingsKeys } from "@/constants/Settings";
import { getSetting, insertSetting } from "@/db/database";

/**
 * NotificationService - Handles all cycle prediction notification logic
 */
class NotificationServiceClass {
  /**
   * Get notification settings from storage
   */
  async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const settingsRecord = await getSetting(SettingsKeys.notificationSettings);

      if (!settingsRecord || !settingsRecord.value) {
        return DEFAULT_NOTIFICATION_SETTINGS;
      }

      return JSON.parse(settingsRecord.value) as NotificationSettings;
    } catch (error) {
      console.error("Error getting notification settings:", error);
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
  }

  /**
   * Save notification settings to storage
   */
  async saveNotificationSettings(
    settings: NotificationSettings,
  ): Promise<void> {
    try {
      await insertSetting(
        SettingsKeys.notificationSettings,
        JSON.stringify(settings),
      );
    } catch (error) {
      console.error("Error saving notification settings:", error);
    }
  }

  /**
   * Parse time string (HH:MM) and combine with date
   */
  private parseTime(timeStr: string, date: Date): Date {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  /**
   * Get the first day of each predicted cycle
   * (Predictions come as individual days, we need to group by cycle)
   */
  private getFirstDaysOfCycles(predictions: PredictedDate[]): PredictedDate[] {
    if (predictions.length === 0) return [];

    const sortedPredictions = [...predictions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const firstDays: PredictedDate[] = [];
    let lastDate: Date | null = null;

    for (const prediction of sortedPredictions) {
      const currentDate = new Date(prediction.date);

      // If this is the first prediction or there's a gap (new cycle)
      if (
        !lastDate ||
        (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24) > 1
      ) {
        firstDays.push(prediction);
      }

      lastDate = currentDate;
    }

    return firstDays;
  }

  /**
   * Schedule all notifications for current predictions
   */
  async scheduleAllPredictionNotifications(
    predictions: PredictedDate[],
  ): Promise<void> {
    try {
      // Get settings
      const settings = await this.getNotificationSettings();

      if (!settings.enabled) {
        console.log("[NotificationService] Notifications disabled in settings");
        return;
      }

      // Check permissions
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        console.log("[NotificationService] Notifications not permitted by OS");
        return;
      }

      // Cancel all existing cycle prediction notifications first
      await this.clearAllPredictionNotifications();

      // Get first day of each predicted cycle
      const firstDays = this.getFirstDaysOfCycles(predictions);

      console.log(
        `[NotificationService] Scheduling notifications for ${firstDays.length} cycles`,
      );

      // Schedule notifications for each cycle
      for (const prediction of firstDays) {
        await this.scheduleNotificationForPrediction(prediction, settings);
      }
    } catch (error) {
      console.error("Error scheduling prediction notifications:", error);
    }
  }

  /**
   * Schedule notifications for a specific predicted cycle start
   */
  async scheduleNotificationForPrediction(
    prediction: PredictedDate,
    settings: NotificationSettings,
  ): Promise<void> {
    try {
      const predictedDate = new Date(prediction.date + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Don't schedule notifications for past dates
      if (predictedDate <= today) {
        return;
      }

      // Check if confidence meets minimum threshold
      if (prediction.confidence < settings.minConfidence) {
        console.log(
          `[NotificationService] Skipping notification - confidence ${prediction.confidence} below threshold ${settings.minConfidence}`,
        );
        return;
      }

      // Schedule notification for each reminder day
      for (const daysBefore of settings.reminderDaysBefore) {
        const notificationDate = new Date(predictedDate);
        notificationDate.setDate(notificationDate.getDate() - daysBefore);

        // Set the notification time
        const trigger = this.parseTime(
          settings.notificationTime,
          notificationDate,
        );

        // Don't schedule if the trigger time has already passed
        if (trigger <= new Date()) {
          continue;
        }

        // Get appropriate template
        const templateKey =
          daysBefore === 1
            ? "period_upcoming_1_day"
            : daysBefore === 3
              ? "period_upcoming_3_days"
              : daysBefore === 7
                ? "period_upcoming_7_days"
                : "period_upcoming_3_days";

        const template = getNotificationTemplate(templateKey);

        // Schedule the notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: template.title,
            body: template.body,
            data: {
              type: NotificationTypes.PERIOD_UPCOMING,
              predictedDate: prediction.date,
              confidence: prediction.confidence,
              daysBefore,
            },
            sound: settings.soundEnabled ? "default" : undefined,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: trigger,
          } as const,
        });

        console.log(
          `[NotificationService] Scheduled: "${template.title}" for ${trigger.toISOString()}`,
        );
      }
    } catch (error) {
      console.error("Error scheduling notification for prediction:", error);
    }
  }

  /**
   * Clear all cycle prediction notifications
   */
  async clearAllPredictionNotifications(): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();

      let cancelledCount = 0;

      for (const notification of scheduled) {
        const notifType = notification.content.data?.type;
        if (
          notifType === NotificationTypes.PERIOD_UPCOMING ||
          notifType === NotificationTypes.PERIOD_TODAY ||
          notifType === NotificationTypes.PERIOD_LATE
        ) {
          await Notifications.cancelScheduledNotificationAsync(
            notification.identifier,
          );
          cancelledCount++;
        }
      }

      console.log(
        `[NotificationService] Cleared ${cancelledCount} prediction notifications`,
      );
    } catch (error) {
      console.error("Error clearing prediction notifications:", error);
    }
  }

  /**
   * Refresh notifications (clear old ones and schedule new ones)
   * Call this when predictions change or settings change
   */
  async refreshNotifications(predictions: PredictedDate[]): Promise<void> {
    console.log("[NotificationService] Refreshing notifications");
    await this.scheduleAllPredictionNotifications(predictions);
  }

  /**
   * Check if period is late and send notification if needed
   * This should be called when app opens or on a background task
   */
  async checkForLatePeriod(predictions: PredictedDate[]): Promise<void> {
    try {
      const settings = await this.getNotificationSettings();

      if (!settings.enabled) {
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find predictions that are overdue
      const firstDays = this.getFirstDaysOfCycles(predictions);

      for (const prediction of firstDays) {
        const predictedDate = new Date(prediction.date + "T00:00:00");
        const daysSincePrediction = Math.floor(
          (today.getTime() - predictedDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        // If period is late (3+ days past prediction)
        if (daysSincePrediction >= 3) {
          // Check if we haven't already sent a late notification for this prediction
          const scheduled =
            await Notifications.getAllScheduledNotificationsAsync();
          const alreadySent = scheduled.some(
            (notif) =>
              notif.content.data?.type === NotificationTypes.PERIOD_LATE &&
              notif.content.data?.predictedDate === prediction.date,
          );

          if (!alreadySent) {
            const template = getNotificationTemplate("period_late");

            await Notifications.scheduleNotificationAsync({
              content: {
                title: template.title,
                body: `Your period was expected ${daysSincePrediction} days ago. Update your data if it has started.`,
                data: {
                  type: NotificationTypes.PERIOD_LATE,
                  predictedDate: prediction.date,
                  daysLate: daysSincePrediction,
                },
                sound: settings.soundEnabled ? "default" : undefined,
              },
              trigger: null, // Send immediately
            });

            console.log(
              `[NotificationService] Sent late period notification (${daysSincePrediction} days)`,
            );
          }
        }
      }
    } catch (error) {
      console.error("Error checking for late period:", error);
    }
  }
}

// Export singleton instance
export const NotificationService = new NotificationServiceClass();
