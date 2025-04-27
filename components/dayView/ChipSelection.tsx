import { View, StyleSheet } from "react-native";
import { Text, Chip, useTheme } from "react-native-paper";

export default function ChipSelection({
  options,
  selectedValues,
  setSelectedValues,
  label,
}: {
  options: string[];
  selectedValues: string[];
  setSelectedValues: (values: string[]) => void;
  label: string;
}) {
  const theme = useTheme();

  return (
    <View>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.chipContainer}>
        {options.map((option) => (
          <Chip
            mode="flat"
            key={option}
            selected={selectedValues.includes(option)}
            showSelectedCheck={false}
            elevated={true}
            onPress={() => {
              setSelectedValues(
                selectedValues.includes(option)
                  ? selectedValues.filter((val) => val !== option)
                  : [...selectedValues, option],
              );
            }}
            style={{
              backgroundColor: selectedValues.includes(option)
                ? theme.colors.onSecondary
                : theme.colors.secondary,
              margin: 4,
              borderRadius: 20,
              height: 36,
              justifyContent: "center",
            }}
            textStyle={{
              color: selectedValues.includes(option)
                ? theme.colors.onSecondaryContainer
                : theme.colors.secondaryContainer,
            }}
          >
            {option}
          </Chip>
        ))}
      </View>
    </View>
  );
}

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
