import { View } from "react-native";
import { Button, Divider, List, Text, useTheme } from "react-native-paper";
import { ThemedView } from "@/components/ThemedView";
import {
  usePredictionChoice,
  usePredictedCycle,
  useCalendarFilters,
} from "@/assets/src/calendar-storage";
import { useFetchCycleData } from "@/hooks/useFetchCycleData";
import { useRef } from "react";
import { SettingsKeys } from "@/constants/Settings";
import { insertSetting } from "@/db/database";

export default function CyclePredictions() {
  const theme = useTheme();
  const { predictionChoice, setPredictionChoice } = usePredictionChoice();
  const { setPredictedCycle, setPredictedMarkedDates } = usePredictedCycle();
  const { fetchCycleData } = useFetchCycleData(
    setPredictedCycle,
    setPredictedMarkedDates,
  );
  const { setSelectedFilters, selectedFilters } = useCalendarFilters();
  const fetchCycleDataRef = useRef(fetchCycleData);
  fetchCycleDataRef.current = fetchCycleData;

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
            predictionChoice
              ? "Cycle Predictions (Enabled)"
              : "Cycle Predictions (Disabled)"
          }
          titleStyle={{
            fontSize: 20,
          }}
        >
          <View style={{ paddingLeft: 15, paddingRight: 15, gap: 10 }}>
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
            >
              {predictionChoice ? "Enabled" : "Disabled"}
            </Button>

            <Text>
              This feature is fully developmental and only works when you mark
              your cycles with the "Cycle Start" and "Cycle End" options under
              the "Flow" section of the Calendar page. You need to input at
              least one menstrual cycle for your next cycle prediction to
              appear.
            </Text>
            <Text>
              Currently, this will take the average length of your logged
              menstrual cycles to determine your predicted cycle. If only one
              cycle is logged, it will calculate based off of a "normal" 28-day
              cycle. Once you have multiple cycles logged, the average time
              between cycles will also be factored in. This is currently
              experimental and is will not factor in anything else besides these
              two averages. Please keep in mind that predicted cycles may be
              inaccurate.
            </Text>
          </View>
        </List.Accordion>
      </List.Section>
      {/* Divider wouldn't show up on Android with the margin added */}
      <Divider style={{ marginBottom: 0.2 }} />
    </ThemedView>
  );
}
