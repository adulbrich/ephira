import { ThemedView } from "@/components/ThemedView";
import AuthenticationSettings from "@/components/AuthenticationSettings";
import PrivacyPolicy from "@/components/ui/PrivacyPolicy";
import DeleteData from "@/components/DeleteData";
import { Text } from "react-native-paper";
import { ScrollView, SafeAreaView } from "react-native";

export default function Settings() {
  return (
    <ThemedView style={{ height: "100%", padding: 10 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Text variant="titleLarge" style={{ textAlign: "center" }}>
          Settings
        </Text>
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
          <AuthenticationSettings />
          <DeleteData />
          <PrivacyPolicy />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
