import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Text, useTheme } from "react-native-paper";
import StatusCard from "@/components/cycle/StatusCard";
import PredictionCard from "@/components/cycle/PredictionCard";
import { useCyclePhase } from "@/hooks/useCyclePhase";
import {
  useData,
  usePredictedCycle,
  useDatabaseChangeNotifier,
} from "@/assets/src/calendar-storage";
import { useFetchCycleData } from "@/hooks/useFetchCycleData";
import { CYCLE_PREDICTION_CONSTANTS } from "@/constants/CyclePrediction";
import { CYCLE_PHASES } from "@/constants/CyclePhases";

function WelcomeCardMini() {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <Text
          variant="titleMedium"
          style={{ color: theme.colors.onSurface, fontWeight: "700" }}
        >
          Cycle Insights
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}
        >
          Log flow in Calendar to unlock predictions and tips.
        </Text>
        <Text
          variant="bodySmall"
          style={{
            color: theme.colors.onSurfaceVariant,
            marginTop: 6,
            fontStyle: "italic",
          }}
        >
          Need {CYCLE_PREDICTION_CONSTANTS.MIN_CYCLES_FOR_PREDICTION} complete cycles for predictions.
        </Text>
      </Card.Content>
    </Card>
  );
}

function InsufficientMini({ cyclesTracked }: { cyclesTracked: number }) {
  const theme = useTheme();
  const needed =
    CYCLE_PREDICTION_CONSTANTS.MIN_CYCLES_FOR_PREDICTION - cyclesTracked;

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: "700" }}>
          Building Your Cycle Profile
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}
        >
          Tracked {cyclesTracked} cycle{cyclesTracked !== 1 ? "s" : ""}. Track {needed} more to unlock predictions.
        </Text>
      </Card.Content>
    </Card>
  );
}

export default function CyclePreview() {
  const theme = useTheme();

  const { data: flowData } = useData();
  const { predictedCycle, setPredictedCycle } = usePredictedCycle();
  const { databaseChange } = useDatabaseChangeNotifier();
  const { fetchCycleData } = useFetchCycleData(setPredictedCycle);

  const { cycleState, stats, loading, refresh } = useCyclePhase(
    flowData,
    predictedCycle
  );

  useEffect(() => {
    fetchCycleData();
  }, [fetchCycleData]);

  useEffect(() => {
    fetchCycleData();
    refresh();
  }, [databaseChange, fetchCycleData, refresh]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
        >
          Loading…
        </Text>
      </View>
    );
  }

  if (!cycleState || !stats) {
    return <WelcomeCardMini />;
  }

  const currentPhase = CYCLE_PHASES[cycleState.currentPhase];

  return (
    <View style={styles.stack}>
      <StatusCard
        phase={currentPhase}
        cycleDay={cycleState.cycleDay}
        cycleLength={cycleState.cycleLength}
      />

      {cycleState.hasEnoughData ? (
        <PredictionCard
          daysUntilNextPeriod={cycleState.daysUntilNextPeriod}
          nextPredictedStart={cycleState.nextPredictedStart}
          predictedDates={predictedCycle}
          confidence={cycleState.confidence}
        />
      ) : (
        <InsufficientMini cyclesTracked={stats.totalCyclesTracked} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    flex: 1,
    gap: 10,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  card: {
    borderRadius: 16,
  },
});