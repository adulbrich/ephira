import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { List, Text, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import { getSetting, updateSetting } from "@/db/database";
import { SettingsKeys, TRACKING_MODES } from "@/constants/Settings";
import { useTrackingMode } from "@/assets/src/calendar-storage";

export default function TrackingModeSettings() {
  const theme = useTheme();
  const router = useRouter();
  const { trackingMode, setTrackingMode } = useTrackingMode();
  const [localMode, setLocalMode] = useState<string>(TRACKING_MODES.CYCLE);

  useEffect(() => {
    getSetting(SettingsKeys.trackingMode).then((s) => {
      const mode = s?.value ?? TRACKING_MODES.CYCLE;
      setLocalMode(mode);
      setTrackingMode(mode);
    });
  }, [setTrackingMode]);

  const handleSwitch = () => {
    const targetMode =
      localMode === TRACKING_MODES.CYCLE
        ? TRACKING_MODES.PREGNANCY
        : TRACKING_MODES.CYCLE;

    const targetLabel =
      targetMode === TRACKING_MODES.PREGNANCY
        ? "Pregnancy Tracking"
        : "Cycle Tracking";

    Alert.alert(
      `Switch to ${targetLabel}?`,
      `This will switch the app to ${targetLabel} mode. Your existing data will not be affected.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Switch",
          style: "default",
          onPress: async () => {
            await updateSetting(SettingsKeys.trackingMode, targetMode);
            setLocalMode(targetMode);
            setTrackingMode(targetMode);
            if (targetMode === TRACKING_MODES.PREGNANCY) {
              router.replace("/(pregnancy-tabs)" as any);
            } else {
              router.replace("/(tabs)" as any);
            }
          },
        },
      ],
    );
  };

  const currentLabel =
    localMode === TRACKING_MODES.PREGNANCY
      ? "Pregnancy Tracking"
      : "Cycle Tracking";

  const switchLabel =
    localMode === TRACKING_MODES.PREGNANCY
      ? "Switch to Cycle Tracking"
      : "Switch to Pregnancy Tracking";

  return (
    <List.Section>
      <List.Accordion
        title="Tracking Mode"
        description={currentLabel}
        left={(props) => <List.Icon {...props} icon="swap-horizontal" />}
      >
        <List.Item
          title={switchLabel}
          description="Your existing data will not be affected"
          descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
          left={(props) => (
            <List.Icon
              {...props}
              icon={
                localMode === TRACKING_MODES.PREGNANCY
                  ? "calendar-heart"
                  : "baby-carriage"
              }
              color={theme.colors.primary}
            />
          )}
          onPress={handleSwitch}
          titleStyle={{ color: theme.colors.primary }}
        />
        <Text
          style={{
            fontSize: 13,
            color: theme.colors.onSurfaceVariant,
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
        >
          Currently in{" "}
          <Text style={{ fontWeight: "bold" }}>{currentLabel}</Text> mode.
        </Text>
      </List.Accordion>
    </List.Section>
  );
}
