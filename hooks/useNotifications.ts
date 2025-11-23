import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { NotificationType } from "@/constants/Notifications";

/**
 * Configure how notifications are handled when app is in foreground
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface ScheduleNotificationConfig {
  title: string;
  body: string;
  data?: Record<string, any>;
  trigger: Date | null; // null for immediate notification
  sound?: boolean;
}

export const useNotifications = () => {
  const [permissionStatus, setPermissionStatus] = useState<
    "granted" | "denied" | "undetermined"
  >("undetermined");

  // Check permission status on mount
  useEffect(() => {
    checkPermissionStatus();
  }, []);

  /**
   * Check current notification permission status
   */
  const checkPermissionStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(
      status === "granted"
        ? "granted"
        : status === "denied"
          ? "denied"
          : "undetermined",
    );
    return status;
  };

  /**
   * Request notification permissions from user
   */
  const requestPermissions = async (): Promise<boolean> => {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      // Only ask if permissions have not already been determined
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      const granted = finalStatus === "granted";
      setPermissionStatus(granted ? "granted" : "denied");

      if (!granted) {
        console.log("Notification permissions denied");
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Cycle Predictions",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#9892a0",
          sound: "default",
        });
      }

      return true;
    } catch (error) {
      console.error("Error requesting notification permissions:", error);
      return false;
    }
  };

  /**
   * Schedule a notification
   * @returns notification identifier (for cancellation) or null if failed
   */
  const scheduleNotification = async (
    config: ScheduleNotificationConfig,
  ): Promise<string | null> => {
    try {
      const { status } = await Notifications.getPermissionsAsync();

      if (status !== "granted") {
        console.log("Cannot schedule notification - permissions not granted");
        return null;
      }

      const trigger = config.trigger
        ? ({ type: Notifications.SchedulableTriggerInputTypes.DATE, date: config.trigger } as const)
        : null; // null = immediate

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: config.title,
          body: config.body,
          data: config.data || {},
          sound: config.sound !== false ? "default" : undefined,
        },
        trigger,
      });

      console.log(
        `[Notification] Scheduled: ${notificationId} for ${config.trigger ? config.trigger.toISOString() : "immediate"}`,
      );

      return notificationId;
    } catch (error) {
      console.error("Error scheduling notification:", error);
      return null;
    }
  };

  /**
   * Cancel a specific scheduled notification
   */
  const cancelNotification = async (
    notificationId: string,
  ): Promise<boolean> => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`[Notification] Cancelled: ${notificationId}`);
      return true;
    } catch (error) {
      console.error("Error cancelling notification:", error);
      return false;
    }
  };

  /**
   * Cancel all scheduled notifications
   */
  const cancelAllNotifications = async (): Promise<boolean> => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log("[Notification] Cancelled all scheduled notifications");
      return true;
    } catch (error) {
      console.error("Error cancelling all notifications:", error);
      return false;
    }
  };

  /**
   * Get all currently scheduled notifications
   */
  const getScheduledNotifications = async () => {
    try {
      const notifications =
        await Notifications.getAllScheduledNotificationsAsync();
      return notifications;
    } catch (error) {
      console.error("Error getting scheduled notifications:", error);
      return [];
    }
  };

  /**
   * Cancel notifications by type (using data.type field)
   */
  const cancelNotificationsByType = async (
    type: NotificationType,
  ): Promise<number> => {
    try {
      const scheduled = await getScheduledNotifications();
      let cancelledCount = 0;

      for (const notification of scheduled) {
        if (notification.content.data?.type === type) {
          await Notifications.cancelScheduledNotificationAsync(
            notification.identifier,
          );
          cancelledCount++;
        }
      }

      console.log(
        `[Notification] Cancelled ${cancelledCount} notifications of type: ${type}`,
      );
      return cancelledCount;
    } catch (error) {
      console.error("Error cancelling notifications by type:", error);
      return 0;
    }
  };

  /**
   * Send a test notification immediately
   */
  const sendTestNotification = async (): Promise<boolean> => {
    const result = await scheduleNotification({
      title: "Test Notification",
      body: "This is a test notification from Ephira. Notifications are working!",
      data: { type: "test" },
      trigger: null, // Immediate
      sound: true,
    });

    return result !== null;
  };

  return {
    permissionStatus,
    requestPermissions,
    checkPermissionStatus,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    getScheduledNotifications,
    cancelNotificationsByType,
    sendTestNotification,
  };
};
