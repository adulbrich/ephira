import { ThemedView } from "@/components/ThemedView";
import AuthenticationSettings from "@/components/AuthenticationSettings";
import PrivacyPolicy from "@/components/ui/PrivacyPolicy";
import { View } from "react-native"
import { Text, List, Divider } from "react-native-paper"
import { Link } from "expo-router"

export default function Settings() {
  return (
    <ThemedView style={{ height: "100%", padding: 10 }}>
      <Text variant="titleLarge" style={{ textAlign: "center" }}>
        Settings
      </Text>
      <AuthenticationSettings />
      <PrivacyPolicy />
    </ThemedView>
  );
}