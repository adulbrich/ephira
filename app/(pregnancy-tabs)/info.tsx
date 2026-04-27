import { ThemedView } from "@/components/ThemedView";
import FadeInView from "@/components/animations/FadeInView";
import { Text, useTheme, Card } from "react-native-paper";
import {
  SafeAreaView,
  StyleSheet,
  View,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { IconSymbol } from "@/components/ui/IconSymbol";

// The idea here is that this tab will eventually be up to date with whatever week the user is at
// Placeholder is week 5, but by the end of pregnancy tracking implementation, this tab *should* be providing information accurate
// ^From what users have entered for their information, and should continue to autonomously update per week with new insights

//currentWeek should update automatically based on the progression of the pregnancy, and trimester should be the same as well

const currentWeek = 5;

const pregnancyWeekInfo = {
  week: 5,
  trimester: "First Trimester",
  babyDevelopment:
    "The brain, spinal cord, and early heart tissue are starting to develop.",
  commonSymptoms: [
    "Fatigue",
    "Breast tenderness",
    "Nausea",
    "Mood changes",
    "Frequent urination",
  ],
  tips: [
    "Start or continue taking a prenatal vitamin if recommended by your provider.",
    "Try small, frequent meals if you feel nauseous.",
    "Rest when possible and stay hydrated.",
  ],
  reminder:
    "Every pregnancy is different. Contact a healthcare provider if symptoms feel severe or concerning.",
};

function PregnancyStatusCard() {
  const theme = useTheme();

  return (
    <Card style={styles.heroCard} mode="outlined">
      <Card.Content style={styles.heroContent}>
        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
          Week {pregnancyWeekInfo.week}
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.cardText, { color: theme.colors.onSurfaceVariant }]}
        >
          {pregnancyWeekInfo.trimester}
        </Text>
      </Card.Content>
    </Card>
  );
}

function BabyDevelopmentCard() {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.cardContent}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          Baby Development
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.cardText, { color: theme.colors.onSurfaceVariant }]}
        >
          {pregnancyWeekInfo.babyDevelopment}
        </Text>
      </Card.Content>
    </Card>
  );
}

function SymptomsCard() {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.cardContent}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          Common Symptoms This Week
        </Text>
        {pregnancyWeekInfo.commonSymptoms.map((symptom) => (
          <Text
            key={symptom}
            variant="bodyMedium"
            style={[styles.listItem, { color: theme.colors.onSurfaceVariant }]}
          >
            • {symptom}
          </Text>
        ))}
      </Card.Content>
    </Card>
  );
}

function TipsCard() {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.cardContent}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          Tips
        </Text>
        {pregnancyWeekInfo.tips.map((tip) => (
          <Text
            key={tip}
            variant="bodyMedium"
            style={[styles.listItem, { color: theme.colors.onSurfaceVariant }]}
          >
            • {tip}
          </Text>
        ))}
      </Card.Content>
    </Card>
  );
}

function ReminderCard() {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.cardContent}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          Reminder
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.cardText, { color: theme.colors.onSurfaceVariant }]}
        >
          {pregnancyWeekInfo.reminder}
        </Text>
      </Card.Content>
    </Card>
  );
}

function SourcesCard() {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.cardContent}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          Sources
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.cardText, { color: theme.colors.onSurfaceVariant }]}
        >
          ACOG, Mayo Clinic, CDC, Cleveland Clinic
        </Text>
      </Card.Content>
    </Card>
  );
}

export default function PregnancyInfo() {
  const theme = useTheme();

  return (
    <FadeInView duration={200} backgroundColor={theme.colors.background}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <IconSymbol
                size={64}
                name="info.circle"
                color={theme.colors.primary}
              />
              <Text
                variant="headlineSmall"
                style={[styles.title, { color: theme.colors.onBackground }]}
              >
                Pregnancy Insights
              </Text>
            </View>

            <PregnancyStatusCard />
            <BabyDevelopmentCard />
            <SymptomsCard />
            <TipsCard />
            <ReminderCard />
            <SourcesCard />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    paddingTop: StatusBar.currentHeight,
    paddingBottom: Platform.select({
      ios: 60,
      default: 0,
    }),
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: "center",
    gap: 12,
  },
  title: {
    textAlign: "center",
    fontWeight: "bold",
  },
  heroCard: {
    borderRadius: 16,
  },
  heroContent: {
    padding: 16,
    alignItems: "center",
  },
  card: {
    borderRadius: 16,
  },
  cardContent: {
    padding: 8,
  },
  cardText: {
    marginTop: 8,
    lineHeight: 20,
  },
  listItem: {
    marginTop: 8,
    lineHeight: 20,
  },
});
