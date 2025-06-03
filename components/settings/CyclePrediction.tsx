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
  const { setPredictedCycle } = usePredictedCycle();
  const { fetchCycleData } = useFetchCycleData(setPredictedCycle);
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
              This feature is fully developmental and determines your latest
              cycle based on consecutive flow days logged. Logging up to 3
              consecutive flow days will allow the app to predict your next
              cycle start date. You can enable or disable this feature at any
              time in this menu. When cycle predictions are enabled, they will
              appear within the filter menu to toggle them as visible on the
              calendar.
            </Text>
            <Text>
              Another part to note about this feature is that once your
              predicted cycle dates pass, they will return to "normal" on the
              calendar, and will not show up under the cycle prediction filter.
              To see your next predicted cycle, you will need to log 3
              consecutive flow days again. This means that predicted cycles will
              only show if their date is past todays date.
            </Text>
          </View>
        </List.Accordion>
      </List.Section>
      {/* Divider wouldn't show up on Android with the margin added */}
      <Divider style={{ marginBottom: 0.2 }} />
    </ThemedView>
  );
}
