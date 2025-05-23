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
import { MarkedDates } from "@/constants/Interfaces";
import { useMarkedDates } from "@/hooks/useMarkedDates";

export default function CyclePredictions() {
  const theme = useTheme();
  const { selectedFilters, setSelectedFilters } = useCalendarFilters();
  const { loading, markedDates } = useMarkedDates(selectedFilters);
  const { predictionChoice, setPredictionChoice } = usePredictionChoice();
  const { predictedCycle, setPredictedCycle, setPredictedMarkedDates, predictedMarkedDates } = usePredictedCycle();
  const { fetchCycleData } = useFetchCycleData(setPredictedCycle, setPredictedMarkedDates);
  const fetchCycleDataRef = useRef(fetchCycleData);
  fetchCycleDataRef.current = fetchCycleData;


  // const handleUserChoice = () => {
  //   setPredictionChoice(!predictionChoice);
  // };

  // const printCyclePrediction = async () => {
  //   await fetchCycleData();
  //   console.log("markedDates", markedDates);
  //   console.log("predictedMarkedDates", predictedMarkedDates);
  // };

  return (
    <ThemedView>
      <List.Section>
        <List.Accordion
          title={
            "Cycle Predictions"
          }
          titleStyle={{
            fontSize: 20,
          }}
        >
          <View style={{ paddingLeft: 15, paddingRight: 15, gap: 10 }}>
            <Text>
              Here you can learn more about the Cycle Prediction feature.
            </Text>

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
