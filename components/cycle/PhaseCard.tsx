import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Card, Text, Button, Chip, useTheme } from "react-native-paper";
import { CyclePhaseDefinition } from "@/constants/CyclePhases";
import PhaseInfoModal from "./PhaseInfoModal";

interface PhaseCardProps {
  phase: CyclePhaseDefinition;
  isCurrent: boolean;
  cycleLength?: number;
}

export default function PhaseCard({
  phase,
  isCurrent,
  cycleLength = 28,
}: PhaseCardProps) {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Calculate actual day range for this cycle length
  const getDayRange = () => {
    if (phase.id === "menstrual") {
      return `Days 1-${phase.typicalDays.end}`;
    } else if (phase.id === "follicular") {
      const start = phase.typicalDays.start;
      const end = Math.round(cycleLength * 0.46);
      return `Days ${start}-${end}`;
    } else if (phase.id === "ovulation") {
      const start = Math.round(cycleLength * 0.46) + 1;
      const end = Math.round(cycleLength * 0.57);
      return `Days ${start}-${end}`;
    } else {
      const start = Math.round(cycleLength * 0.57) + 1;
      return `Days ${start}-${cycleLength}`;
    }
  };

  // Show first 3 symptoms as preview
  const previewSymptoms = phase.commonSymptoms.slice(0, 3);

  return (
    <>
      <Card style={styles.card} mode="outlined">
        <Card.Content style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View
                style={[styles.phaseIndicator, { backgroundColor: phase.color }]}
              />
              <View>
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onSurface }}
                >
                  {isCurrent ? "Current Phase" : "Next Phase"}
                </Text>
                <Text
                  variant="headlineSmall"
                  style={[styles.phaseName, { color: phase.color }]}
                >
                  {phase.name}
                </Text>
              </View>
            </View>
            <Text
              variant="labelMedium"
              style={[styles.dayRange, { color: theme.colors.onSurfaceVariant }]}
            >
              {getDayRange()}
            </Text>
          </View>

          <Text
            variant="bodyMedium"
            style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
          >
            {phase.bodyDescription.slice(0, 100)}...
          </Text>

          <View style={styles.symptomsRow}>
            {previewSymptoms.map((symptom, index) => (
              <Chip
                key={index}
                compact
                mode="flat"
                style={[
                  styles.symptomChip,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
                textStyle={styles.symptomChipText}
              >
                {symptom}
              </Chip>
            ))}
          </View>
        </Card.Content>
        <Card.Actions>
          <Button onPress={() => setModalVisible(true)}>Learn More</Button>
        </Card.Actions>
      </Card>

      <PhaseInfoModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        phase={phase}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  phaseIndicator: {
    width: 4,
    height: 48,
    borderRadius: 2,
    marginRight: 12,
  },
  phaseName: {
    fontWeight: "600",
  },
  dayRange: {
    marginTop: 4,
  },
  description: {
    marginBottom: 12,
    lineHeight: 20,
  },
  symptomsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  symptomChip: {
    borderRadius: 16,
  },
  symptomChipText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
