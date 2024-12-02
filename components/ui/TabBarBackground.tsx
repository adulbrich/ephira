// This is a shim for web and Android where the tab bar is generally opaque.
// tabbarbackground.tsx
import React from "react"
import { View, StyleSheet } from "react-native"
import { useTheme } from "react-native-paper"

// This is for Android where the tab bar background color is opaque.
export default function TabBarBackground() {
  const theme = useTheme()
  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        { backgroundColor: theme.colors.background }, // Apply background color from theme
      ]}
    />
  )
}

export function useBottomTabOverflow() {
  return 0
}
