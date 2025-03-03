import { ThemedView } from "@/components/ThemedView";
import AuthenticationSettings from "@/components/settings/AuthenticationSettings";
import PrivacyPolicy from "@/components/settings/PrivacyPolicy";
import DeleteData from "@/components/settings/DeleteData";
import Customization from "@/components/settings/Customization";
import { Text, Divider, useTheme } from "react-native-paper";
import { ScrollView, SafeAreaView } from "react-native";
import ThemeSelector from "@/components/ThemeSelector";

export default function Settings() {
  const theme = useTheme();
  return (
    <ThemedView style={{ height: "100%", padding: 10 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Text
          variant="titleLarge"
          style={{
            textAlign: "center",
            fontSize: 30,
            fontWeight: "bold",
            color: theme.colors.onBackground,
          }}
        >
          Settings
        </Text>
        <Divider style={{ marginTop: 10 }} />
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
          <Customization />
          <AuthenticationSettings />
          <ThemeSelector />
          <DeleteData />
          <PrivacyPolicy />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
