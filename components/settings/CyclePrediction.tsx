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
import { insertSetting, getAllDays } from "@/db/database";
import { CYCLE_PREDICTION_CONSTANTS } from "@/constants/CyclePrediction";

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

        // Count cycles
        let cycleCount = 0;
        let consecutiveDays = 0;
        const sortedDays = flowDays.sort(
          (a, b) => new Date(a.date).valueOf() - new Date(b.date).valueOf(),
        );

        for (let i = 0; i < sortedDays.length; i++) {
          const currentDate = new Date(sortedDays[i].date);
          const nextDate =
            i < sortedDays.length - 1 ? new Date(sortedDays[i + 1].date) : null;

          consecutiveDays++;

          const isLastDay = i === sortedDays.length - 1;
          const isGap = nextDate
            ? (nextDate.getTime() - currentDate.getTime()) /
                (1000 * 60 * 60 * 24) >
              1
            : false;

          if (
            (isLastDay || isGap) &&
            consecutiveDays >= CYCLE_PREDICTION_CONSTANTS.MIN_CONSECUTIVE_DAYS
          ) {
            cycleCount++;
            consecutiveDays = 0;
          } else if (isGap) {
            consecutiveDays = 0;
          }
        }

        const hasEnough =
          cycleCount >= CYCLE_PREDICTION_CONSTANTS.MIN_CYCLES_FOR_PREDICTION;
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
    if (selectedFilters.includes("Cycle Prediction")) {
      if (newPredictionChoice) {
        // If enabling cycle predictions, fetch the cycle data
        await fetchCycleDataRef.current();
      } else {
        // If disabling cycle predictions, remove the filter
        const updatedFilters = selectedFilters.filter(
          (filter) => filter !== "Cycle Prediction",
        );
        setSelectedFilters(updatedFilters);
      }
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
          </View>
        </List.Accordion>
      </List.Section>
      {/* Divider wouldn't show up on Android with the margin added */}
      <Divider style={{ marginBottom: 0.2 }} />
    </ThemedView>
  );
}
