import { View, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";

// This is for Android where the tab bar background color is opaque.
export default function TabBarBackground() {
  const theme = useTheme();
  return (
    <View
      style={[
        // RN 0.85 removed StyleSheet.absoluteFillObject; absoluteFill is the
        // registered equivalent and the only one that still exists.
        StyleSheet.absoluteFill,
        { backgroundColor: theme.colors.background }, // Apply background color from theme
      ]}
    />
  );
}

export function useBottomTabOverflow() {
  return 0;
}
