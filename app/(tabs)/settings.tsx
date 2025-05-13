import { ThemedView } from "@/components/ThemedView";
import AuthenticationSettings from "@/components/settings/AuthenticationSettings";
import PrivacyPolicy from "@/components/settings/PrivacyPolicy";
import DeleteData from "@/components/settings/DeleteData";
import Customization from "@/components/settings/Customization";
import { Text, Divider, useTheme } from "react-native-paper";
import { ScrollView, SafeAreaView, StyleSheet } from "react-native";
import ThemeSelector from "@/components/settings/ThemeSelector";
import FadeInView from "@/components/animations/FadeInView";
import CyclePredictions from "@/components/settings/CyclePrediction";

export default function Settings() {
  const theme = useTheme();
  return (
    <FadeInView duration={200} backgroundColor={theme.colors.background}>
      <ThemedView style={{ height: "100%", padding: 10 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <Text
            variant="titleLarge"
            style={{
              textAlign: "center",
              fontSize: 30,
              fontWeight: "bold",
              color: theme.colors.onBackground,
              paddingTop: 4,
            }}
          >
            Settings
          </Text>
          <Divider style={{ marginTop: 10 }} />
          <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
            <AuthenticationSettings />
            <Divider style={styles.divider} />
            <Customization />
            <Divider style={styles.divider} />
            <ThemeSelector />
            <Divider style={styles.divider} />
            <DeleteData />
            <Divider style={styles.divider} />
            <CyclePredictions />
            <PrivacyPolicy />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  /* Divider wouldn't show up on Android with the margin added */
  divider: {
    marginBottom: 0.2,
  },
});
