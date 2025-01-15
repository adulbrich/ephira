import { Text } from "react-native-paper"
import { ThemedView } from "@/components/ThemedView"
import { Stack } from "expo-router"

export default function PrivacyPolicy() {
  return (
    <ThemedView style={{ height: "100%", padding: 10 }}>
      <Stack.Screen 
        options={{ 
          title: "Privacy Policy",
          headerShown: true 
        }} 
      />
      <Text variant="titleLarge" style={{ marginBottom: 10}}>
        About Us
      </Text>

      <Text variant="bodyMedium">
        Your privacy is important to us. This app stores all data locally on your device and does not transmit any personal information.
      </Text>

      <Text variant="titleLarge" style={{ marginTop: 20, marginBottom: 10 }}>
        Data Collection
      </Text>

      <Text variant="bodyMedium">
        Your privacy is important to us. This app stores all data locally on your device and does not transmit any personal information.
      </Text>

      <Text variant="titleLarge" style={{ marginTop: 20, marginBottom: 10 }}>
        Permissions
      </Text>

      <Text variant="bodyMedium">
        Your privacy is important to us. This app stores all data locally on your device and does not transmit any personal information.
      </Text>
    </ThemedView>
  )
} 