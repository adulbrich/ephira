import { View } from "react-native";
import { List, Text } from "react-native-paper";
import SingleChipSelection from "./SingleChipSelection";

const flowOptions = ["None", "Spotting", "Light", "Medium", "Heavy"];

function FlowChips({
  selectedOption,
  setSelectedOption,
}: {
  selectedOption: number;
  setSelectedOption: (option: number) => void;
}) {
  return (
    <View style={{ width: "100%" }}>
      <SingleChipSelection
        options={flowOptions}
        selectedValue={flowOptions[selectedOption]}
        setSelectedValue={(value) => {
          if (value !== null) {
            setSelectedOption(flowOptions.indexOf(value));
          }
        }}
        label="Select Flow Intensity"
      />
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
      title={
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ width: 120, fontSize: 16 }}>Flow Intensity</Text>
          <Text style={{ fontSize: 16 }}>
            |{"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
            {flowOptions[flow_intensity]}
          </Text>
        </View>
      }
      expanded={state === "flow"}
      onPress={() => setExpandedAccordion(state === "flow" ? null : "flow")}
      left={(props) => <List.Icon {...props} icon="water" />}
    >
      <FlowChips selectedOption={flow_intensity} setSelectedOption={setFlow} />
    </List.Accordion>
  );
}
