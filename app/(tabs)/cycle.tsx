import { useEffect } from "react";
import {
  StyleSheet,
  View,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import {
  useTheme,
  Text,
  Card,
  Button,
  ActivityIndicator,
} from "react-native-paper";
import FadeInView from "@/components/animations/FadeInView";
import StatusCard from "@/components/cycle/StatusCard";
import PredictionCard from "@/components/cycle/PredictionCard";
import PhaseCard from "@/components/cycle/PhaseCard";
import CycleStatsCard from "@/components/cycle/CycleStatsCard";
import TipsCard from "@/components/cycle/TipsCard";
import { useCyclePhase } from "@/hooks/useCyclePhase";
import {
  useData,
  usePredictedCycle,
  useDatabaseChangeNotifier,
  usePredictionChoice,
} from "@/assets/src/calendar-storage";
import { useFetchCycleData } from "@/hooks/useFetchCycleData";
import { CYCLE_PHASES, getNextPhase } from "@/constants/CyclePhases";
import { CYCLE_PREDICTION_CONSTANTS } from "@/constants/CyclePrediction";

function WelcomeCard() {
  const theme = useTheme();

  return (
    <Card style={styles.welcomeCard} mode="outlined">
      <Card.Content style={styles.welcomeContent}>
        <Text
          variant="headlineSmall"
          style={[styles.welcomeTitle, { color: theme.colors.onSurface }]}
        >
          Welcome to Cycle Insights
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.welcomeText, { color: theme.colors.onSurfaceVariant }]}
        >
          Start logging your flow in the Calendar tab to see personalized cycle
          insights, predictions, and wellness tips.
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.welcomeHint, { color: theme.colors.onSurfaceVariant }]}
        >
          Log at least {CYCLE_PREDICTION_CONSTANTS.MIN_CYCLES_FOR_PREDICTION}{" "}
          complete cycles ({CYCLE_PREDICTION_CONSTANTS.MIN_CONSECUTIVE_DAYS}+
          days each) to enable predictions.
        </Text>
      </Card.Content>
    </Card>
  );
}

function InsufficientDataCard({ cyclesTracked }: { cyclesTracked: number }) {
  const theme = useTheme();
  const needed =
    CYCLE_PREDICTION_CONSTANTS.MIN_CYCLES_FOR_PREDICTION - cyclesTracked;

  return (
    <Card style={styles.insufficientCard} mode="outlined">
      <Card.Content style={styles.insufficientContent}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          Building Your Cycle Profile
        </Text>
        <Text
          variant="bodyMedium"
          style={[
            styles.insufficientText,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          You've tracked {cyclesTracked} cycle{cyclesTracked !== 1 ? "s" : ""}.
          Track {needed} more to unlock predictions and detailed insights.
        </Text>
      </Card.Content>
    </Card>
  );
}

function PredictionsDisabledCard() {
  const theme = useTheme();

  return (
    <Card style={styles.disabledCard} mode="outlined">
      <Card.Content style={styles.disabledContent}>
        <Text
          variant="headlineSmall"
          style={[styles.disabledTitle, { color: theme.colors.onSurface }]}
        >
          Cycle Predictions Disabled
        </Text>
        <Text
          variant="bodyMedium"
          style={[
            styles.disabledText,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          Enable cycle predictions in Settings to get info about your cycle.
        </Text>
      </Card.Content>
    </Card>
  );
}

export default function Cycle() {
  const theme = useTheme();
  const { data: flowData } = useData();
  const { predictedCycle, setPredictedCycle } = usePredictedCycle();
  const { databaseChange } = useDatabaseChangeNotifier();
  const { predictionChoice } = usePredictionChoice();
  const { fetchCycleData } = useFetchCycleData(setPredictedCycle);
  const { cycleState, stats, loading, refresh } = useCyclePhase(
    flowData,
    predictedCycle,
  );

  // Refresh data when database changes
  useEffect(() => {
    fetchCycleData();
    refresh();
  }, [databaseChange]);

  // Initial load
  useEffect(() => {
    fetchCycleData();
  }, []);

  if (loading) {
    return (
      <FadeInView duration={200} backgroundColor={theme.colors.background}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.container}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}
              >
                Loading cycle data...
              </Text>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </FadeInView>
    );
  }

  // Predictions disabled
  if (!predictionChoice) {
    return (
      <FadeInView duration={200} backgroundColor={theme.colors.background}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.container}>
            <View style={styles.centeredContainer}>
              <PredictionsDisabledCard />
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </FadeInView>
    );
  }

  // No data at all
  if (!cycleState || !stats) {
    return (
      <FadeInView duration={200} backgroundColor={theme.colors.background}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.container}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <WelcomeCard />
            </ScrollView>
          </SafeAreaView>
        </SafeAreaProvider>
      </FadeInView>
    );
  }

  const currentPhase = CYCLE_PHASES[cycleState.currentPhase];
  const nextPhaseId = getNextPhase(cycleState.currentPhase);
  const nextPhase = CYCLE_PHASES[nextPhaseId];

  return (
    <FadeInView duration={200} backgroundColor={theme.colors.background}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Status Card - Hero */}
            <StatusCard
              phase={currentPhase}
              cycleDay={cycleState.cycleDay}
              cycleLength={cycleState.cycleLength}
            />

            {/* Prediction Card */}
            {cycleState.hasEnoughData ? (
              <PredictionCard
                daysUntilNextPeriod={cycleState.daysUntilNextPeriod}
                nextPredictedStart={cycleState.nextPredictedStart}
                predictedDates={predictedCycle}
                confidence={cycleState.confidence}
              />
            ) : (
              <InsufficientDataCard cyclesTracked={stats.totalCyclesTracked} />
            )}

            {/* Current Phase Card */}
            <PhaseCard
              phase={currentPhase}
              isCurrent={true}
              cycleLength={cycleState.cycleLength}
            />

            {/* Next Phase Card */}
            <PhaseCard
              phase={nextPhase}
              isCurrent={false}
              cycleLength={cycleState.cycleLength}
            />

            {/* Cycle Stats Card */}
            <CycleStatsCard stats={stats} />

            {/* Tips Card */}
            <TipsCard
              tips={currentPhase.wellnessTips}
              phaseName={currentPhase.name}
              phaseColor={currentPhase.color}
            />
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight,
    paddingBottom: Platform.select({
      ios: 60,
      default: 0,
    }),
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  welcomeCard: {
    borderRadius: 16,
  },
  welcomeContent: {
    padding: 8,
    alignItems: "center",
  },
  welcomeTitle: {
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  welcomeText: {
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 12,
  },
  welcomeHint: {
    textAlign: "center",
    fontStyle: "italic",
  },
  insufficientCard: {
    borderRadius: 12,
  },
  insufficientContent: {
    padding: 8,
  },
  insufficientText: {
    marginTop: 8,
    lineHeight: 20,
  },
  disabledCard: {
    borderRadius: 16,
  },
  disabledContent: {
    padding: 24,
    alignItems: "center",
  },
  disabledTitle: {
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  disabledText: {
    textAlign: "center",
    lineHeight: 22,
  },
});
