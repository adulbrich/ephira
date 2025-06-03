import { View, StyleSheet } from "react-native";
import { List, useTheme, Text, Chip } from "react-native-paper";
import SingleChipSelection from "./SingleChipSelection";
import { ThemedView } from "../ThemedView";

const flowOptions = ["None", "Spotting", "Light", "Medium", "Heavy"];

const styles = StyleSheet.create({
  chipContainer: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 16,
    paddingTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  sectionLabel: {
    display: "none",
  },
});

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

function CycleToggleButtons({
  toggleStart,
  toggleEnd,
  setStart,
  setEnd,
}: {
  toggleStart?: boolean;
  toggleEnd?: boolean;
  setStart: (option: boolean) => void;
  setEnd: (option: boolean) => void;
}) {
  const theme = useTheme();

  const handleUserToggleStart = () => {
    setStart(!toggleStart);
    setEnd(false);
  };

  const handleUserToggleEnd = () => {
    setEnd(!toggleEnd);
    setStart(false);
  };

  return (
    <ThemedView>
      <View style={styles.chipContainer}>
        <Chip
          mode="flat"
          style={{
            backgroundColor: toggleStart
              ? theme.colors.onSecondary
              : theme.colors.secondary,
            margin: 4,
            borderRadius: 20,
            height: 36,
            justifyContent: "center",
          }}
          textStyle={{
            color: toggleStart
              ? theme.colors.onSecondaryContainer
              : theme.colors.secondaryContainer,
          }}
          onPress={handleUserToggleStart}
        >
          Cycle Start
        </Chip>
        <Chip
          mode="flat"
          style={{
            backgroundColor: toggleEnd
              ? theme.colors.onSecondary
              : theme.colors.secondary,
            margin: 4,
            borderRadius: 20,
            height: 36,
            justifyContent: "center",
          }}
          textStyle={{
            color: toggleEnd
              ? theme.colors.onSecondaryContainer
              : theme.colors.secondaryContainer,
          }}
          onPress={handleUserToggleEnd}
        >
          Cycle End
        </Chip>
      </View>
    </ThemedView>
  );
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
  is_cycle_start?: boolean;
  setCycleStart: (choice: boolean) => void;
  is_cycle_end?: boolean;
  setCycleEnd: (choice: boolean) => void;
}) {
  return (
    <List.Accordion
      title={
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ width: 120, fontSize: 16 }}>Flow</Text>
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
      {flow_intensity !== 0 && (
        <CycleToggleButtons
          toggleStart={is_cycle_start}
          toggleEnd={is_cycle_end}
          setStart={setCycleStart}
          setEnd={setCycleEnd}
        />
      )}
      <FlowChips selectedOption={flow_intensity} setSelectedOption={setFlow} />
    </List.Accordion>
  );
}
