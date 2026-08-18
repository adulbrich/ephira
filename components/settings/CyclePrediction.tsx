import { View } from "react-native";
import {
  Button,
  Divider,
  List,
  Text,
  useTheme,
  Card,
} from "react-native-paper";
import { ThemedView } from "@/components/ThemedView";
import {
  usePredictionChoice,
  usePredictedCycle,
  useCalendarFilters,
} from "@/assets/src/calendar-storage";
import { useFetchCycleData } from "@/hooks/useFetchCycleData";
import { useRef, useState, useEffect } from "react";
import { SettingsKeys } from "@/constants/Settings";
import {
  insertSetting,
  getAllDays,
  getPredictionAccuracy,
  generateTestPredictionData,
  deleteAllPredictionSnapshots,
} from "@/db/database";
import { CYCLE_PREDICTION_CONSTANTS } from "@/constants/CyclePrediction";
import {
  countCompleteCycles,
  hasEnoughCyclesForPrediction,
} from "@/services/cyclePredictionLogic";
import type { DayData } from "@/constants/Interfaces";

export default function CyclePredictions() {
  const theme = useTheme();
  const { predictionChoice, setPredictionChoice } = usePredictionChoice();
  const { setPredictedCycle } = usePredictedCycle();
  const { fetchCycleData } = useFetchCycleData(setPredictedCycle);
  const { setSelectedFilters, selectedFilters } = useCalendarFilters();
  const fetchCycleDataRef = useRef(fetchCycleData);
  fetchCycleDataRef.current = fetchCycleData;

  const [dataStatus, setDataStatus] = useState<{
    cycleCount: number;
    hasEnoughData: boolean;
    message: string;
  }>({ cycleCount: 0, hasEnoughData: false, message: "Checking..." });

  const [accuracyStats, setAccuracyStats] = useState<{
    totalChecked: number;
    totalCorrect: number;
    accuracyPercentage: number;
  } | null>(null);

  // Fetch prediction accuracy stats
  useEffect(() => {
    const fetchAccuracy = async () => {
      try {
        const stats = await getPredictionAccuracy();
        setAccuracyStats(stats);
      } catch (error) {
        console.error("Error fetching prediction accuracy:", error);
      }
    };

    if (predictionChoice) {
      fetchAccuracy();
      // Refresh accuracy stats every 10 seconds when predictions are enabled
      const interval = setInterval(fetchAccuracy, 10000);
      return () => clearInterval(interval);
    }
  }, [predictionChoice]);

  useEffect(() => {
    const checkDataQuality = async () => {
      try {
        const allDays = await getAllDays();
        const flowDays = allDays.filter((day) => day.flow_intensity);

        if (flowDays.length === 0) {
          setDataStatus({
            cycleCount: 0,
            hasEnoughData: false,
            message:
              "No flow data logged yet. Start logging to enable predictions!",
          });
          return;
        }

        // One definition of a Cycle, shared with the cycle tab. This used to
        // be its own gap-detection pass that never consulted the
        // is_cycle_start / is_cycle_end markers, so marking a cycle start
        // changed what the cycle tab said and not what this screen said.
        const cycleCount = countCompleteCycles(flowDays as DayData[]);

        const hasEnough = hasEnoughCyclesForPrediction(flowDays as DayData[]);
        let message = "";

        if (hasEnough) {
          message = `Great! You have ${cycleCount} complete cycles logged.`;
        } else {
          const needed =
            CYCLE_PREDICTION_CONSTANTS.MIN_CYCLES_FOR_PREDICTION - cycleCount;
          message = `You have ${cycleCount} cycle${cycleCount === 1 ? "" : "s"}. Log ${needed} more complete cycle${needed === 1 ? "" : "s"} for predictions.`;
        }

        setDataStatus({ cycleCount, hasEnoughData: hasEnough, message });

        // Auto-disable predictions if data becomes insufficient
        if (!hasEnough && predictionChoice) {
          setPredictionChoice(false);
          setPredictedCycle([]);
          await insertSetting(
            SettingsKeys.cyclePredictions,
            JSON.stringify(false),
          );
          // Remove from filters if present
          if (selectedFilters.includes("Cycle Prediction")) {
            const updatedFilters = selectedFilters.filter(
              (filter) => filter !== "Cycle Prediction",
            );
            setSelectedFilters(updatedFilters);
          }
        }
      } catch (error) {
        console.error("Error checking data quality:", error);
        setDataStatus({
          cycleCount: 0,
          hasEnoughData: false,
          message: "Error checking data quality",
        });
      }
    };

    checkDataQuality();
  }, [
    predictionChoice,
    selectedFilters,
    setPredictionChoice,
    setPredictedCycle,
    setSelectedFilters,
  ]);

  // Sync prediction state with calendar data
  useEffect(() => {
    const syncPredictionData = async () => {
      if (!predictionChoice) {
        // Clear prediction data when disabled
        setPredictedCycle([]);
      } else if (dataStatus.hasEnoughData) {
        // Fetch prediction data when enabled and has enough data
        await fetchCycleDataRef.current();
      }
    };

    syncPredictionData();
  }, [predictionChoice, dataStatus.hasEnoughData, setPredictedCycle]);

  const handleOptionChange = async () => {
    const newPredictionChoice = !predictionChoice;
    setPredictionChoice(newPredictionChoice);

    if (newPredictionChoice) {
      // If enabling cycle predictions, add filter back if not present and fetch data
      if (!selectedFilters.includes("Cycle Prediction")) {
        setSelectedFilters([...selectedFilters, "Cycle Prediction"]);
      }
      await fetchCycleDataRef.current();
    } else {
      // If disabling cycle predictions, remove the filter
      const updatedFilters = selectedFilters.filter(
        (filter) => filter !== "Cycle Prediction",
      );
      setSelectedFilters(updatedFilters);
    }

    await insertSetting(
      SettingsKeys.cyclePredictions,
      JSON.stringify(newPredictionChoice),
    );
  };

  return (
    <ThemedView>
      <List.Section>
        <List.Accordion
          title={
            !dataStatus.hasEnoughData
              ? "Cycle Predictions (Disabled)"
              : predictionChoice
                ? "Cycle Predictions (Enabled)"
                : "Cycle Predictions (Disabled)"
          }
          titleStyle={{
            fontSize: 20,
          }}
        >
          <View style={{ paddingLeft: 15, paddingRight: 15, gap: 10 }}>
            <Card
              mode="outlined"
              style={{
                backgroundColor: dataStatus.hasEnoughData
                  ? theme.colors.primaryContainer
                  : theme.colors.surfaceVariant,
                marginBottom: 10,
              }}
            >
              <Card.Content>
                <Text variant="titleMedium" style={{ marginBottom: 5 }}>
                  Data Status
                </Text>
                <Text>{dataStatus.message}</Text>
                {!dataStatus.hasEnoughData && dataStatus.cycleCount > 0 && (
                  <Text
                    style={{ marginTop: 5, fontSize: 12, fontStyle: "italic" }}
                  >
                    Tip: Each cycle needs at least{" "}
                    {CYCLE_PREDICTION_CONSTANTS.MIN_CONSECUTIVE_DAYS}{" "}
                    consecutive flow days.
                  </Text>
                )}
              </Card.Content>
            </Card>

            {accuracyStats && accuracyStats.totalChecked > 0 && (
              <Card
                mode="outlined"
                style={{
                  backgroundColor:
                    accuracyStats.accuracyPercentage >= 80
                      ? theme.colors.primaryContainer
                      : accuracyStats.accuracyPercentage >= 50
                        ? theme.colors.secondaryContainer
                        : theme.colors.errorContainer,
                  marginBottom: 10,
                }}
              >
                <Card.Content>
                  <Text variant="titleMedium" style={{ marginBottom: 5 }}>
                    Prediction Accuracy
                  </Text>
                  <Text variant="headlineSmall" style={{ fontWeight: "bold" }}>
                    {accuracyStats.accuracyPercentage}%
                  </Text>
                  <Text style={{ marginTop: 5 }}>
                    {accuracyStats.totalCorrect} out of{" "}
                    {accuracyStats.totalChecked} predictions were accurate
                  </Text>
                  <Text
                    style={{ marginTop: 5, fontSize: 12, fontStyle: "italic" }}
                  >
                    {accuracyStats.accuracyPercentage >= 80
                      ? "Excellent! Your cycles are very predictable."
                      : accuracyStats.accuracyPercentage >= 50
                        ? "Good accuracy. Continue logging for better predictions."
                        : "Your cycles may be irregular. Consider consulting a healthcare provider."}
                  </Text>
                </Card.Content>
              </Card>
            )}

            <Text>
              Here you can choose whether or not to enable cycle predictions.
            </Text>
            <Button
              mode="elevated"
              textColor={theme.colors.onPrimaryContainer}
              buttonColor={theme.colors.primaryContainer}
              onPress={async () => {
                await handleOptionChange();
              }}
              disabled={!dataStatus.hasEnoughData}
            >
              {predictionChoice ? "Enabled" : "Disabled"}
            </Button>
            {!dataStatus.hasEnoughData && (
              <Text
                style={{
                  fontSize: 12,
                  fontStyle: "italic",
                  color: theme.colors.error,
                }}
              >
                You need at least{" "}
                {CYCLE_PREDICTION_CONSTANTS.MIN_CYCLES_FOR_PREDICTION} complete
                cycles to enable predictions.
              </Text>
            )}

            {predictionChoice && dataStatus.hasEnoughData && (
              <Card
                mode="outlined"
                style={{
                  backgroundColor: theme.colors.secondaryContainer,
                  marginTop: 10,
                }}
              >
                <Card.Content>
                  <Text variant="titleMedium" style={{ marginBottom: 5 }}>
                    💡 Want reminders?
                  </Text>
                  <Text>
                    Enable notifications in the settings below to get reminded
                    before your predicted periods.
                  </Text>
                </Card.Content>
              </Card>
            )}

            <Text>
              This feature predicts your next menstrual cycles based on your
              logged flow data. The app analyzes your cycle history to calculate
              your average cycle length and predicts the next 3 upcoming cycles.
            </Text>
            <Text variant="titleMedium" style={{ marginTop: 10 }}>
              How it works:
            </Text>
            <Text>
              • Log at least 3 consecutive flow days to create a cycle
            </Text>
            <Text>
              • The app calculates your average cycle length from past cycles
            </Text>
            <Text>
              • Predictions appear on the calendar for your next{" "}
              {CYCLE_PREDICTION_CONSTANTS.MAX_FUTURE_CYCLES} cycles
            </Text>
            <Text>• More historical data = more accurate predictions</Text>
            <Text>
              • Confidence levels shown by size & brightness (taller & brighter
              = more confident)
            </Text>
            <Text>
              • Accuracy is tracked automatically as you log new flow data
            </Text>
            <Text variant="titleMedium" style={{ marginTop: 10 }}>
              Tips for accuracy:
            </Text>
            <Text>• Log consistently for at least 2-3 complete cycles</Text>
            <Text>
              • Use the "Cycle Start" toggle to manually mark cycle beginnings
            </Text>
            <Text>• Predictions only show for future dates</Text>
            <Text style={{ marginTop: 10, fontStyle: "italic" }}>
              Note: Predictions are estimates based on your unique patterns. If
              you have irregular cycles, predictions may be less accurate.
            </Text>

            {/* Test utilities - only show in development */}
            {__DEV__ && (
              <>
                <Text
                  variant="titleMedium"
                  style={{ marginTop: 20, color: theme.colors.error }}
                >
                  🧪 Test Utilities (Dev Only)
                </Text>
                <View style={{ gap: 10, marginTop: 10 }}>
                  <Button
                    mode="outlined"
                    onPress={async () => {
                      await generateTestPredictionData("high");
                      // Trigger refresh
                      const stats = await getPredictionAccuracy();
                      setAccuracyStats(stats);
                    }}
                  >
                    Generate High Accuracy (85%)
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={async () => {
                      await generateTestPredictionData("medium");
                      const stats = await getPredictionAccuracy();
                      setAccuracyStats(stats);
                    }}
                  >
                    Generate Medium Accuracy (65%)
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={async () => {
                      await generateTestPredictionData("low");
                      const stats = await getPredictionAccuracy();
                      setAccuracyStats(stats);
                    }}
                  >
                    Generate Low Accuracy (35%)
                  </Button>
                  <Button
                    mode="outlined"
                    buttonColor={theme.colors.errorContainer}
                    onPress={async () => {
                      await deleteAllPredictionSnapshots();
                      setAccuracyStats(null);
                    }}
                  >
                    Clear All Test Data
                  </Button>
                </View>
              </>
            )}
          </View>
        </List.Accordion>
      </List.Section>
      {/* Divider wouldn't show up on Android with the margin added */}
      <Divider style={{ marginBottom: 0.2 }} />
    </ThemedView>
  );
}
