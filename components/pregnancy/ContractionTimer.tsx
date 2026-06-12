import { StyleSheet } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { useContractionTimer } from "@/hooks/useContractionTimer";

export default function ContractionTimer() {
  const theme = useTheme();
  const { isRunning, elapsedMs, lastDurationMs, toggle, formatDuration } =
    useContractionTimer();

  return (
    <>
      {lastDurationMs !== null && !isRunning ? (
        <Text
          variant="bodySmall"
          style={{
            color: theme.colors.onSurfaceVariant,
            textAlign: "center",
          }}
        >
          Last contraction: {formatDuration(lastDurationMs)}
        </Text>
      ) : null}
      <Button
        mode={isRunning ? "contained-tonal" : "contained"}
        icon={isRunning ? "timer-off-outline" : "timer-outline"}
        onPress={toggle}
        style={styles.actionButton}
      >
        {isRunning
          ? `Stop Contraction (${formatDuration(elapsedMs)})`
          : "Start Contraction Timer"}
      </Button>
    </>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    width: "100%",
    marginTop: 8,
  },
});
