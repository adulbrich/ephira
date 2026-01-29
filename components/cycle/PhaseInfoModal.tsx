import { ScrollView, View, StyleSheet, Linking } from "react-native";
import { Dialog, Portal, Button, Text, Divider, useTheme } from "react-native-paper";
import { CyclePhaseDefinition } from "@/constants/CyclePhases";

const handleOpenUrl = (url: string) => {
  Linking.openURL(url);
};

interface PhaseInfoModalProps {
  visible: boolean;
  onDismiss: () => void;
  phase: CyclePhaseDefinition;
}

export default function PhaseInfoModal({
  visible,
  onDismiss,
  phase,
}: PhaseInfoModalProps) {
  const theme = useTheme();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>{phase.name} Phase</Dialog.Title>
        <Dialog.Content>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <View
              style={[
                styles.phaseIndicator,
                { backgroundColor: phase.color },
              ]}
            />

            <Text variant="titleMedium" style={styles.sectionTitle}>
              What's happening in your body
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.bodyText, { color: theme.colors.onSurfaceVariant }]}
            >
              {phase.bodyDescription}
            </Text>

            <Divider style={styles.divider} />

            <Text variant="titleMedium" style={styles.sectionTitle}>
              Common Symptoms
            </Text>
            <View style={styles.symptomsList}>
              {phase.commonSymptoms.map((symptom, index) => (
                <Text
                  key={index}
                  variant="bodyMedium"
                  style={[styles.listItem, { color: theme.colors.onSurfaceVariant }]}
                >
                  {"\u2022"} {symptom}
                </Text>
              ))}
            </View>

            <Divider style={styles.divider} />

            <Text variant="titleMedium" style={styles.sectionTitle}>
              Hormone Info
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.bodyText, { color: theme.colors.onSurfaceVariant }]}
            >
              {phase.hormoneInfo}
            </Text>

            <Divider style={styles.divider} />

            <Text variant="titleMedium" style={styles.sectionTitle}>
              Wellness Tips
            </Text>
            <View style={styles.tipsList}>
              {phase.wellnessTips.map((tip, index) => (
                <Text
                  key={index}
                  variant="bodyMedium"
                  style={[styles.listItem, { color: theme.colors.onSurfaceVariant }]}
                >
                  {"\u2022"} {tip}
                </Text>
              ))}
            </View>

            <Divider style={styles.divider} />

            <Button
              mode="outlined"
              icon="open-in-new"
              onPress={() => handleOpenUrl(phase.learnMoreUrl)}
              style={styles.readMoreButton}
            >
              Read More at Cleveland Clinic
            </Button>
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Close</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {},
  title: {
    textAlign: "center",
  },
  scrollView: {
    maxHeight: 400,
  },
  scrollContent: {
    paddingBottom: 8,
    paddingRight: 12,
  },
  phaseIndicator: {
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: 8,
  },
  bodyText: {
    lineHeight: 22,
  },
  divider: {
    marginVertical: 16,
  },
  symptomsList: {
    gap: 4,
  },
  tipsList: {
    gap: 8,
  },
  listItem: {
    lineHeight: 22,
    paddingLeft: 8,
  },
  readMoreButton: {
    marginTop: 8,
  },
});
