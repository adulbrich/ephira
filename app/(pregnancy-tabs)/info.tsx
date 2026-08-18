import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
import { getSetting } from "@/db/database";
import { SettingsKeys } from "@/constants/Settings";
import {
  DEFAULT_GESTATION_OFFSET_DAYS,
  getPregnancyWeekContent,
  getTrimesterLabel,
} from "@/constants/Pregnancy";
import { gestationalAge, startOfLocalDay } from "@/utils/pregnancyDates";

// The idea here is that this tab will eventually be up to date with whatever week the user is at
// Placeholder is week 5, but by the end of pregnancy tracking implementation, this tab *should* be providing information accurate
// ^From what users have entered for their information, and should continue to autonomously update per week with new insights

//currentWeek should update automatically based on the progression of the pregnancy, and trimester should be the same as well

type PregnancyWeekInfo = {
  week: number;
  trimester: string;
  babyDevelopment: string;
  commonSymptoms: string[];
  tips: string[];
  reminder: string;
};

function PregnancyStatusCard({
  pregnancyWeekInfo,
}: {
  pregnancyWeekInfo: PregnancyWeekInfo;
}) {
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

function BabyDevelopmentCard({
  pregnancyWeekInfo,
}: {
  pregnancyWeekInfo: PregnancyWeekInfo;
}) {
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

function SymptomsCard({
  pregnancyWeekInfo,
}: {
  pregnancyWeekInfo: PregnancyWeekInfo;
}) {
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

function TipsCard({
  pregnancyWeekInfo,
}: {
  pregnancyWeekInfo: PregnancyWeekInfo;
}) {
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

function ReminderCard({
  pregnancyWeekInfo,
}: {
  pregnancyWeekInfo: PregnancyWeekInfo;
}) {
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
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);

  const loadPregnancyWeek = useCallback(async () => {
    const [startSetting, offsetSetting] = await Promise.all([
      getSetting(SettingsKeys.pregnancyStartDate),
      getSetting(SettingsKeys.pregnancyGestationOffsetDays),
    ]);

    if (!startSetting?.value) {
      setCurrentWeek(null);
      return;
    }

    const age = gestationalAge(
      startSetting.value,
      Number(offsetSetting?.value ?? DEFAULT_GESTATION_OFFSET_DAYS),
      startOfLocalDay(),
    );

    const week = age.weekNumber;

    setCurrentWeek(week);
  }, []);

  useEffect(() => {
    loadPregnancyWeek();
  }, [loadPregnancyWeek]);

  useFocusEffect(
    useCallback(() => {
      loadPregnancyWeek();
    }, [loadPregnancyWeek]),
  );

  const selectedWeek =
    currentWeek !== null ? getPregnancyWeekContent(currentWeek) : null;

  const pregnancyWeekInfo: PregnancyWeekInfo | null =
    currentWeek !== null && selectedWeek
      ? {
          week: currentWeek,
          trimester: getTrimesterLabel(currentWeek),
          babyDevelopment: selectedWeek.babyDevelopment,
          commonSymptoms: selectedWeek.commonSymptoms,
          tips: selectedWeek.tips,
          reminder:
            "Every pregnancy is different. Contact a healthcare provider if symptoms feel severe or concerning.",
        }
      : null;

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

            {pregnancyWeekInfo ? (
              <>
                <PregnancyStatusCard pregnancyWeekInfo={pregnancyWeekInfo} />
                <BabyDevelopmentCard pregnancyWeekInfo={pregnancyWeekInfo} />
                <SymptomsCard pregnancyWeekInfo={pregnancyWeekInfo} />
                <TipsCard pregnancyWeekInfo={pregnancyWeekInfo} />
                <ReminderCard pregnancyWeekInfo={pregnancyWeekInfo} />
                <SourcesCard />
              </>
            ) : (
              <Card style={styles.heroCard} mode="outlined">
                <Card.Content style={styles.heroContent}>
                  <Text
                    variant="headlineSmall"
                    style={{ color: theme.colors.onSurface }}
                  >
                    Set Up Pregnancy Progress
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.cardText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Enter your pregnancy details on the home tab to see weekly
                    insights here.
                  </Text>
                </Card.Content>
              </Card>
            )}
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
