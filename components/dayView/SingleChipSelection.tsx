import { View, StyleSheet } from "react-native";
import { Text, Chip, useTheme } from "react-native-paper";
import {
  loggingGridStyles,
  useLoggingChipGridStyle,
} from "@/components/dayView/loggingGridLayout";

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
  const { chipStyle } = useLoggingChipGridStyle();

  return (
    <View>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={loggingGridStyles.grid}>
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
              borderRadius: 20,
              height: 36,
              justifyContent: "center",
              ...chipStyle,
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
  sectionLabel: {
    display: "none",
  },
});
