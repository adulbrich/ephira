import { View} from "react-native";
import {
  Button,
  Divider,
  List,
  Text,
  useTheme,
} from "react-native-paper";
import { ThemedView } from "@/components/ThemedView";
import { usePredictionChoice } from "@/assets/src/calendar-storage";

export default function CyclePredictions() {
  const theme = useTheme();
  const { predictionChoice, setPredictionChoice } = usePredictionChoice();

  const handleUserChoice = () => {
      setPredictionChoice(!predictionChoice)
  }

  return (
    <ThemedView>
      <List.Section>
        <List.Accordion
          title={predictionChoice ? "Cycle Predictions (ON)" : "Cycle Predictions (OFF)"}
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
              onPress={handleUserChoice}
            >
              {predictionChoice ? "Cycle Prediction is ON" : "Cycle Prediction is OFF"}
            </Button>
          </View>
        </List.Accordion>
      </List.Section>
      {/* Divider wouldn't show up on Android with the margin added */}
      <Divider style={{ marginBottom: 0.2 }} />
    </ThemedView>
  );
}
