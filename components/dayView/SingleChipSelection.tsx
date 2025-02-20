import { View, StyleSheet } from "react-native";
import { Text, Chip, useTheme } from "react-native-paper";

export default function SingleChipSelection({
  options,
  selectedValue,
  setSelectedValue,
  label,
}: {
  options: string[];
  selectedValue: string | null;
  setSelectedValue: (value: string | null) => void;
  label: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ padding: 16 }}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.chipContainer}>
        {options.map((option) => (
          <Chip
            mode="flat"
            key={option}
            selected={selectedValue === option}
            showSelectedCheck={false}
            elevated={true}
            onPress={() =>
              setSelectedValue(selectedValue === option ? null : option)
            }
            style={{
              backgroundColor:
                selectedValue === option
                  ? theme.colors.onSecondary
                  : theme.colors.secondary,
              margin: 4,
              borderRadius: 20,
              height: 36,
              justifyContent: "center",
            }}
            textStyle={{
              color:
                selectedValue === option
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
    flexDirection: "row",
    flexWrap: "wrap",
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
});
