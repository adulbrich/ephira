import { View } from "react-native";
import { List, Text, Chip, useTheme, Divider } from "react-native-paper";
import { ThemedView } from "@/components/ThemedView";
import { useState, useEffect } from "react";
import { SettingsKeys } from "@/constants/Settings";
import { birthControlOptions } from "@/constants/BirthControlTypes";
import { getSetting, updateSetting } from "@/db/operations/settings";
import { LONG_TERM_BC_TYPES } from "@/db/quickBirthControl";

const BC_DESCRIPTIONS: Record<string, string> = {
  Pill: "Taken daily.",
  Ring: "Inserted monthly.",
  Patch: "Changed weekly.",
  Shot: "Administered every ~3 months.",
  IUD: "Long-term. No daily logging needed.",
  Implant: "Long-term. No daily logging needed.",
};

export default function BirthControlSettings() {
  const theme = useTheme();
  const [activeType, setActiveType] = useState<string | null>(null);

  useEffect(() => {
    getSetting(SettingsKeys.activeBirthControlType).then((s) => {
      setActiveType(s?.value ?? null);
    });
  }, []);

  const handleSelect = async (type: string) => {
    const next = type === activeType ? null : type;
    setActiveType(next);
    if (next) {
      await updateSetting(SettingsKeys.activeBirthControlType, next);
    } else {
      await updateSetting(SettingsKeys.activeBirthControlType, "");
    }
  };

  const title = activeType
    ? `Birth Control (${activeType})`
    : "Birth Control (Not configured)";

  return (
    <ThemedView>
      <List.Section>
        <List.Accordion title={title} titleStyle={{ fontSize: 20 }}>
          <View style={{ paddingHorizontal: 15, paddingBottom: 12, gap: 10 }}>
            <Text>Select your current birth control method.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {birthControlOptions.map((type) => (
                <Chip
                  key={type}
                  selected={activeType === type}
                  onPress={() => handleSelect(type)}
                  showSelectedCheck
                  style={
                    activeType === type
                      ? { backgroundColor: theme.colors.primaryContainer }
                      : undefined
                  }
                >
                  {type}
                </Chip>
              ))}
            </View>
            {activeType && (
              <Text
                style={{ fontSize: 13, color: theme.colors.onSurfaceVariant }}
              >
                {BC_DESCRIPTIONS[activeType]}
                {LONG_TERM_BC_TYPES.includes(activeType)
                  ? " The home screen will show an informational indicator instead of a log button."
                  : " The Quick Birth Control button on the home screen will log it for today."}
              </Text>
            )}
          </View>
        </List.Accordion>
      </List.Section>
      <Divider style={{ marginBottom: 0.2 }} />
    </ThemedView>
  );
}
