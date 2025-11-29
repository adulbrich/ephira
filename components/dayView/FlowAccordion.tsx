import { View, StyleSheet } from "react-native";
import { List, useTheme, Text, Chip } from "react-native-paper";
import { ThemedView } from "../ThemedView";
import { FlowColors } from "@/constants/Colors";

const flowOptions = ["None", "Spotting", "Light", "Medium", "Heavy"];

// Map flow options to their corresponding colors
const getFlowColor = (option: string): string => {
  switch (option.toLowerCase()) {
    case "none":
      return FlowColors.white;
    case "spotting":
      return FlowColors.spotting;
    case "light":
      return FlowColors.light;
    case "medium":
      return FlowColors.medium;
    case "heavy":
      return FlowColors.heavy;
    default:
      return FlowColors.white;
  }
};

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
  const theme = useTheme();
  const selectedValue = flowOptions[selectedOption];

  return (
    <View style={{ width: "100%" }}>
      <View style={styles.chipContainer}>
        {flowOptions.map((option) => {
          const isSelected = selectedValue === option;
          const flowColor = getFlowColor(option);
          // Use darker text color for better contrast on light backgrounds
          const textColor = option === "None" ? "#000000" : "#ffffff";

          return (
            <Chip
              mode="flat"
              key={option}
              selected={isSelected}
              showSelectedCheck={false}
              elevated={true}
              onPress={() => {
                const newIndex = flowOptions.indexOf(option);
                setSelectedOption(isSelected ? 0 : newIndex);
              }}
              style={{
                backgroundColor: flowColor,
                margin: 4,
                borderRadius: 20,
                height: 36,
                justifyContent: "center",
                borderWidth: isSelected ? 2 : 0,
                borderColor: theme.colors.onSecondaryContainer,
              }}
              textStyle={{
                color: textColor,
                fontWeight: isSelected ? "bold" : "normal",
              }}
            >
              {option}
            </Chip>
          );
        })}
      </View>
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
