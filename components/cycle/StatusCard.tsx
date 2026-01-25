import { View, StyleSheet } from "react-native";
import { Card, Text } from "react-native-paper";
import { CyclePhaseDefinition } from "@/constants/CyclePhases";

interface StatusCardProps {
  phase: CyclePhaseDefinition;
  cycleDay: number;
  cycleLength: number;
}

export default function StatusCard({
  phase,
  cycleDay,
  cycleLength,
}: StatusCardProps) {
  return (
    <Card style={styles.card} mode="contained">
      <View style={[styles.background, { backgroundColor: phase.color }]}>
        <View style={styles.content}>
          <View style={styles.phaseRow}>
            <View style={styles.phaseDot} />
            <Text variant="labelLarge" style={styles.phaseLabel}>
              Current Phase
            </Text>
          </View>

          <Text variant="headlineLarge" style={styles.phaseName}>
            {phase.name}
          </Text>

          <Text variant="bodyLarge" style={styles.shortDescription}>
            {phase.shortDescription}
          </Text>

          <View style={styles.cycleDayContainer}>
            <Text variant="displaySmall" style={styles.cycleDayNumber}>
              Day {cycleDay}
            </Text>
            <Text variant="titleMedium" style={styles.cycleDayOf}>
              of {cycleLength}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
  background: {
    padding: 24,
  },
  content: {
    alignItems: "center",
  },
  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    marginRight: 8,
  },
  phaseLabel: {
    color: "rgba(255, 255, 255, 0.9)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  phaseName: {
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  shortDescription: {
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 16,
  },
  cycleDayContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  cycleDayNumber: {
    color: "#fff",
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cycleDayOf: {
    color: "rgba(255, 255, 255, 0.8)",
    marginLeft: 8,
  },
});
