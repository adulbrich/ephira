import { View, Linking, Platform } from "react-native";
import {
  Button,
  Divider,
  List,
  Text,
  useTheme,
  Card,
  Chip,
} from "react-native-paper";
import { ThemedView } from "@/components/ThemedView";
import { useNotifications } from "@/hooks/useNotifications";
import { useState, useEffect } from "react";
import {
  NotificationSettings as NotificationSettingsType,
  DEFAULT_NOTIFICATION_SETTINGS,
} from "@/constants/Notifications";
import { NotificationService } from "@/services/notificationService";
import { usePredictedCycle } from "@/assets/src/calendar-storage";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function NotificationSettings() {
  const theme = useTheme();
  const {
    permissionStatus,
    requestPermissions,
    checkPermissionStatus,
    sendTestNotification,
    getScheduledNotifications,
  } = useNotifications();

  const { predictedCycle } = usePredictedCycle();
  const [settings, setSettings] = useState<NotificationSettingsType>(
    DEFAULT_NOTIFICATION_SETTINGS,
  );
  const [scheduledCount, setScheduledCount] = useState<number>(0);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    checkPermissionStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update scheduled notification count when settings change
  useEffect(() => {
    updateScheduledCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.enabled]);

  const loadSettings = async () => {
    try {
      const savedSettings = await NotificationService.getNotificationSettings();
      setSettings(savedSettings);
    } catch (error) {
      console.error("Error loading notification settings:", error);
    }
  };

  const saveSettings = async (newSettings: NotificationSettingsType) => {
    try {
      await NotificationService.saveNotificationSettings(newSettings);
      setSettings(newSettings);

      // Refresh notifications with new settings
      if (newSettings.enabled && predictedCycle.length > 0) {
        await NotificationService.refreshNotifications(predictedCycle);
      } else if (!newSettings.enabled) {
        await NotificationService.clearAllPredictionNotifications();
      }

      updateScheduledCount();
    } catch (error) {
      console.error("Error saving notification settings:", error);
    }
  };

  const updateScheduledCount = async () => {
    const scheduled = await getScheduledNotifications();
    setScheduledCount(scheduled.length);
  };

  const handleEnableToggle = async () => {
    if (!settings.enabled && permissionStatus !== "granted") {
      // Need to request permission first
      const granted = await requestPermissions();
      if (!granted) {
        return;
      }
    }

    const newSettings = { ...settings, enabled: !settings.enabled };
    await saveSettings(newSettings);
  };

  const handleReminderDaysToggle = async (day: number) => {
    const newReminderDays = settings.reminderDaysBefore.includes(day)
      ? settings.reminderDaysBefore.filter((d) => d !== day)
      : [...settings.reminderDaysBefore, day].sort((a, b) => a - b);

    const newSettings = { ...settings, reminderDaysBefore: newReminderDays };
    await saveSettings(newSettings);
  };

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);

    if (event.type === "set" && selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, "0");
      const minutes = selectedDate.getMinutes().toString().padStart(2, "0");
      const timeString = `${hours}:${minutes}`;

      const newSettings = { ...settings, notificationTime: timeString };
      await saveSettings(newSettings);
    }
  };

  const handleSoundToggle = async () => {
    const newSettings = { ...settings, soundEnabled: !settings.soundEnabled };
    await saveSettings(newSettings);
  };

  const handleTestNotification = async () => {
    const success = await sendTestNotification();
    if (!success) {
      console.log("Failed to send test notification");
    }
  };

  const openSystemSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  // Parse time string for picker
  const getTimeForPicker = (): Date => {
    const [hours, minutes] = settings.notificationTime.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  return (
    <ThemedView>
      <List.Section>
        <List.Accordion
          title={
            settings.enabled
              ? "Notifications (Enabled)"
              : "Notifications (Disabled)"
          }
          titleStyle={{ fontSize: 20 }}
        >
          <View style={{ paddingLeft: 15, paddingRight: 15, gap: 10 }}>
            {/* Permission Status */}
            {permissionStatus === "denied" && (
              <Card
                mode="outlined"
                style={{
                  backgroundColor: theme.colors.errorContainer,
                  marginBottom: 10,
                }}
              >
                <Card.Content>
                  <Text variant="titleMedium" style={{ marginBottom: 5 }}>
                    Notifications Blocked
                  </Text>
                  <Text style={{ marginBottom: 10 }}>
                    You've denied notification permissions. To enable reminders,
                    open your device Settings.
                  </Text>
                  <Button
                    mode="outlined"
                    onPress={openSystemSettings}
                    textColor={theme.colors.error}
                  >
                    Open Settings
                  </Button>
                </Card.Content>
              </Card>
            )}

            {permissionStatus === "undetermined" && (
              <Card
                mode="outlined"
                style={{
                  backgroundColor: theme.colors.secondaryContainer,
                  marginBottom: 10,
                }}
              >
                <Card.Content>
                  <Text variant="titleMedium" style={{ marginBottom: 5 }}>
                    Enable Notifications
                  </Text>
                  <Text style={{ marginBottom: 10 }}>
                    Get reminders before your predicted periods. We'll ask for
                    permission when you enable notifications.
                  </Text>
                </Card.Content>
              </Card>
            )}

            {/* Enable/Disable Toggle */}
            <Text>
              Get notified before your predicted periods to help you stay
              prepared.
            </Text>
            <Button
              mode="elevated"
              textColor={theme.colors.onPrimaryContainer}
              buttonColor={theme.colors.primaryContainer}
              onPress={handleEnableToggle}
              disabled={permissionStatus === "denied"}
            >
              {settings.enabled ? "Enabled" : "Disabled"}
            </Button>

            {settings.enabled && permissionStatus === "granted" && (
              <>
                <Divider style={{ marginVertical: 10 }} />

                {/* Reminder Days */}
                <Text variant="titleMedium">Remind me before my period:</Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 5,
                  }}
                >
                  <Chip
                    selected={settings.reminderDaysBefore.includes(1)}
                    onPress={() => handleReminderDaysToggle(1)}
                    showSelectedCheck={true}
                  >
                    1 day
                  </Chip>
                  <Chip
                    selected={settings.reminderDaysBefore.includes(3)}
                    onPress={() => handleReminderDaysToggle(3)}
                    showSelectedCheck={true}
                  >
                    3 days
                  </Chip>
                  <Chip
                    selected={settings.reminderDaysBefore.includes(7)}
                    onPress={() => handleReminderDaysToggle(7)}
                    showSelectedCheck={true}
                  >
                    1 week
                  </Chip>
                </View>

                <Divider style={{ marginVertical: 10 }} />

                {/* Notification Time */}
                <Text variant="titleMedium">Notification time:</Text>
                <Button
                  mode="outlined"
                  onPress={() => setShowTimePicker(true)}
                  style={{ marginTop: 5 }}
                >
                  {settings.notificationTime}
                </Button>

                {showTimePicker && (
                  <DateTimePicker
                    value={getTimeForPicker()}
                    mode="time"
                    is24Hour={false}
                    onChange={handleTimeChange}
                  />
                )}

                <Divider style={{ marginVertical: 10 }} />

                {/* Sound Toggle */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text variant="titleMedium">Notification sound:</Text>
                  <Button
                    mode={settings.soundEnabled ? "contained" : "outlined"}
                    onPress={handleSoundToggle}
                    compact
                  >
                    {settings.soundEnabled ? "On" : "Off"}
                  </Button>
                </View>

                <Divider style={{ marginVertical: 10 }} />

                {/* Scheduled Notifications Info */}
                {scheduledCount > 0 && (
                  <Card
                    mode="outlined"
                    style={{
                      backgroundColor: theme.colors.primaryContainer,
                      marginVertical: 10,
                    }}
                  >
                    <Card.Content>
                      <Text variant="titleMedium" style={{ marginBottom: 5 }}>
                        Upcoming Reminders
                      </Text>
                      <Text>
                        You have {scheduledCount} notification
                        {scheduledCount === 1 ? "" : "s"} scheduled for your
                        predicted periods.
                      </Text>
                    </Card.Content>
                  </Card>
                )}

                {/* Test Notification */}
                <Button
                  mode="outlined"
                  onPress={handleTestNotification}
                  style={{ marginTop: 10 }}
                >
                  Send Test Notification
                </Button>
              </>
            )}

            {/* Information */}
            <Text variant="titleMedium" style={{ marginTop: 10 }}>
              How it works:
            </Text>
            <Text>
              • Notifications are scheduled based on your cycle predictions
            </Text>
            <Text>
              • You'll only get reminders for predictions with good confidence
            </Text>
            <Text>
              • Reminders automatically update when your predictions change
            </Text>
            <Text>• All notifications are local - your data stays private</Text>

            <Text style={{ marginTop: 10, fontStyle: "italic", fontSize: 12 }}>
              Note: You need to enable cycle predictions and have enough cycle
              data for notifications to work.
            </Text>
          </View>
        </List.Accordion>
      </List.Section>
      <Divider style={{ marginBottom: 0.2 }} />
    </ThemedView>
  );
}
