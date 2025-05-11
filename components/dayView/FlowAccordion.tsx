import { View } from "react-native";
import { Button, List, RadioButton, ToggleButton, useTheme } from "react-native-paper";
import { ThemedView } from "../ThemedView";

const flowOptions = ["None", "Spotting", "Light", "Medium", "Heavy"];

function FlowRadioButtons({
  selectedOption,
  setSelectedOption,
}: {
  selectedOption: number;
  setSelectedOption: (option: number) => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ width: "100%" }}>
      <RadioButton.Group
        value={flowOptions[selectedOption]}
        onValueChange={(value) => setSelectedOption(flowOptions.indexOf(value))}
      >
        {flowOptions.map((button, index) => (
          <RadioButton.Item
            key={button}
            label={button}
            value={button}
            labelStyle={{
              color:
                selectedOption === index
                  ? theme.colors.onSecondaryContainer
                  : theme.colors.onSurfaceVariant,
            }}
          ></RadioButton.Item>
        ))}
      </RadioButton.Group>
    </View>
  );
}

function CycleToggleButtons({
  toggleStart,
  toggleEnd,
  setStart,
  setEnd
}: {
    toggleStart?: boolean;
    toggleEnd?: boolean;
    setStart: (option: boolean) => void;
    setEnd: (option: boolean) => void;
}) {
  const theme = useTheme();

  const handleUserToggleStart = () => {
    setStart(!toggleStart)
    setEnd(false)
  }

  const handleUserToggleEnd = () => {
    setEnd(!toggleEnd)
    setStart(false)
  }

  return (
    <ThemedView>
      <View style={{ paddingLeft: 15, paddingRight: 15, gap: 10 }}>
        <Button
            mode="elevated"
            buttonColor={toggleStart ? theme.colors.onSecondary : theme.colors.secondary}
            textColor={toggleStart ? theme.colors.onSecondaryContainer : theme.colors.secondaryContainer}
          onPress={handleUserToggleStart}
          compact={true}
        >
          Start
        </Button>
        <Button
            mode="elevated"
            buttonColor={toggleEnd ? theme.colors.onSecondary : theme.colors.secondary}
            textColor={toggleEnd ? theme.colors.onSecondaryContainer : theme.colors.secondaryContainer}
          onPress={handleUserToggleEnd}
          compact={true}
          >
            End
        </Button>
      </View>
    </ThemedView>
  )

}


export default function FlowAccordion({
  state,
  setExpandedAccordion,
  flow_intensity,
  setFlow,
  is_cycle_start,
  setCycleStart,
  is_cycle_end,
  setCycleEnd,
}: {
  state: string | null;
  setExpandedAccordion: (accordion: string | null) => void;
  flow_intensity: number;
    setFlow: (intensity: number) => void;
  is_cycle_start?: boolean,
    setCycleStart: (choice: boolean) => void;
  is_cycle_end?: boolean,
  setCycleEnd: (choice: boolean) => void;
}) {
  return (
    <List.Accordion
      title={"Flow Intensity   |   " + flowOptions[flow_intensity]}
      expanded={state === "flow"}
      onPress={() => setExpandedAccordion(state === "flow" ? null : "flow")}
      left={(props) => <List.Icon {...props} icon="water" />}
    >
      <CycleToggleButtons
        toggleStart={is_cycle_start}
        toggleEnd={is_cycle_end}
        setStart={setCycleStart}
        setEnd={setCycleEnd}
      />
      <FlowRadioButtons
        selectedOption={flow_intensity}
        setSelectedOption={setFlow}
      />
    </List.Accordion>
  );
}
