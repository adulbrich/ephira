import { View } from "react-native";
import { Button, List, Text, useTheme } from "react-native-paper";
import { useThemeColor } from "@/assets/src/calendar-storage";
import React, { useEffect } from "react";
import { ThemedView } from "@/components/ThemedView";
import { insertSetting, getSetting } from "@/db/database";
import { themeButtonColors } from "@/constants/Colors";

export default function ThemeSelector() {
  const { themeColor, setThemeColor } = useThemeColor();
  const theme = useTheme();

  useEffect(() => {
    async function fetchThemeColor() {
      const savedTheme = await getSetting("theme");
      if (savedTheme && savedTheme.value) {
        setThemeColor(savedTheme.value);
      }
    }
    fetchThemeColor();
  }, [setThemeColor]);

  // Update database when theme color changes
  const handleThemeChange = (colorName: string) => {
    setThemeColor(colorName);
    insertSetting("theme", colorName);
  };

  return (
    <ThemedView>
      <List.Section>
        <List.Accordion
          title="Change Theme Color"
          titleStyle={{
            fontSize: 20,
          }}
        >
          <View style={{ paddingLeft: 15, paddingRight: 15, gap: 10 }}>
            <Text>Select a theme color</Text>
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}
            >
              {Object.entries(themeButtonColors).map(
                ([colorName, colorHex]) => (
                  <Button
                    key={colorName}
                    mode={themeColor === colorName ? "contained" : "outlined"}
                    onPress={() => handleThemeChange(colorName)}
                    style={{
                      margin: 5,
                      backgroundColor:
                        themeColor === colorName
                          ? theme.colors.inversePrimary
                          : colorHex,
                      borderColor: colorHex,
                      borderWidth: 2,
                    }}
                  >
                    {themeColor === colorName ? (
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "800",
                          color: theme.colors.onPrimary,
                        }}
                      >
                        ✓
                      </Text>
                    ) : (
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "800",
                          color: "transparent",
                        }}
                      >
                        ✓
                      </Text>
                    )}
                  </Button>
                ),
              )}
            </View>
          </View>
        </List.Accordion>
      </List.Section>
    </ThemedView>
  );
}
