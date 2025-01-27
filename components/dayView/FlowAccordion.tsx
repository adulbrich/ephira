import { View } from "react-native";
import { List, RadioButton, useTheme } from "react-native-paper";

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

export default function FlowAccordion({
  state,
  setExpandedAccordion,
  flow_intensity,
  setFlow,
}: {
  state: string | null;
  setExpandedAccordion: (accordion: string | null) => void;
  flow_intensity: number;
  setFlow: (intensity: number) => void;
}) {
  return (
    <List.Accordion
      title={"Flow Intensity   |   " + flowOptions[flow_intensity]}
      expanded={state === "flow"}
      onPress={() => setExpandedAccordion(state === "flow" ? null : "flow")}
      left={(props) => <List.Icon {...props} icon="water" />}
    >
      <FlowRadioButtons
        selectedOption={flow_intensity}
        setSelectedOption={setFlow}
      />
    </List.Accordion>
  );
}
