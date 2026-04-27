import { ThemedView } from "@/components/ThemedView";
import FadeInView from "@/components/animations/FadeInView";
import { Text, useTheme } from "react-native-paper";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { IconSymbol } from "@/components/ui/IconSymbol";

export default function PregnancyCalendar() {
  const theme = useTheme();

  return (
    <FadeInView duration={200} backgroundColor={theme.colors.background}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <Text
            variant="titleLarge"
            style={[styles.title, { color: theme.colors.onBackground }]}
          >
            Calendar
          </Text>
          <View style={styles.content}>
            <IconSymbol
              size={64}
              name="calendar"
              color={theme.colors.primary}
            />
            <Text
              variant="headlineSmall"
              style={[styles.comingSoon, { color: theme.colors.onBackground }]}
            >
              Coming Soon
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.description,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Pregnancy calendar tracking is under development.
            </Text>
          </View>
        </SafeAreaView>
      </ThemedView>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    padding: 10,
  },
  safeArea: {
    flex: 1,
  },
  title: {
    textAlign: "center",
    fontSize: 30,
    fontWeight: "bold",
    paddingTop: 4,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  comingSoon: {
    fontWeight: "bold",
  },
  description: {
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
