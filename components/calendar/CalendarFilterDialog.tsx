import {
  Dialog,
  Portal,
  Button,
  Text,
  Switch,
  Divider,
  List,
  Chip,
} from "react-native-paper";
import { ScrollView, View, Platform, StyleSheet } from "react-native";
import { useState } from "react";
import { symptomOptions } from "@/constants/Symptoms";
import { moodOptions } from "@/constants/Moods";
import { medicationOptions } from "@/constants/Medications";
import { birthControlOptions } from "@/constants/BirthControlTypes";
const flowOption = { label: "Flow", value: "flow" };
const notesOption = { label: "Notes", value: "notes" };
const anySymptomOption = { label: "Any Symptom", value: "any_symptom" };
const anyMoodOption = { label: "Any Mood", value: "any_mood" };
const anyMedicationOption = {
  label: "Any Medication",
  value: "any_medication",
};
const anyBirthControlOption = {
  label: "Any Birth Control",
  value: "any_birth_control",
};

function FilterSection({
  selectedFilters,
  onToggleSwitch,
  isMaxFiltersSelected,
  subheader,
  listItems,
}: {
  selectedFilters: { label: string; value: string }[];
  onToggleSwitch: (filter: { label: string; value: string }) => void;
  isMaxFiltersSelected: boolean;
  subheader: string;
  listItems: { label: string; value: string }[];
}) {
  return (
    <List.Section>
      <List.Subheader>{subheader}</List.Subheader>
      {listItems.map((item) => (
        <List.Item
          style={styles.listItem}
          key={item.value}
          title={item.label}
          right={() => (
            <Switch
              value={selectedFilters.includes(item)}
              onValueChange={() => onToggleSwitch(item)}
              disabled={isMaxFiltersSelected && !selectedFilters.includes(item)}
            />
          )}
        />
      ))}
    </List.Section>
  );
}

export default function CalendarFilterDialog({
  visible,
  setVisible,
}: {
  visible: boolean;
  setVisible: (visible: boolean) => void;
}) {
  const [selectedFilters, setSelectedFilters] = useState<
    { label: string; value: string }[]
  >([flowOption, notesOption]);

  const applyFilter = () => {
    console.log("Filtering!");
    setVisible(false);
  };

  const onToggleSwitch = (filter: { label: string; value: string }) => {
    if (selectedFilters.includes(filter)) {
      setSelectedFilters(
        selectedFilters.filter((f) => f.value !== filter.value)
      );
    } else if (selectedFilters.length < 3) {
      setSelectedFilters([...selectedFilters, filter]);
    }
  };

  const isMaxFiltersSelected = selectedFilters.length >= 3;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={() => console.log("dismissed")}>
        <Dialog.Title style={{ textAlign: "center" }}>
          Filter Calendar
        </Dialog.Title>
        <Dialog.Content>
          <Text variant="labelLarge" style={{ marginBottom: 8 }}>
            Current Filters ({selectedFilters.length}/3):
          </Text>
          <View style={styles.chipContainer}>
            {selectedFilters.map((filter) => (
              <Chip
                key={filter.value}
                onClose={() =>
                  setSelectedFilters(
                    selectedFilters.filter((f) => f.value !== filter.value)
                  )
                }
                style={styles.chip}
              >
                {filter.label}
              </Chip>
            ))}
          </View>
          <Divider style={{ marginTop: 12 }} />
          <ScrollView style={{ maxHeight: 400 }}>
            <List.Section>
              <List.Item
                style={styles.listItem}
                key={flowOption.value}
                title={flowOption.label}
                right={() => (
                  <Switch
                    value={selectedFilters.includes(flowOption)}
                    onValueChange={() => onToggleSwitch(flowOption)}
                    disabled={
                      isMaxFiltersSelected &&
                      !selectedFilters.includes(flowOption)
                    }
                  />
                )}
              />
              <List.Item
                style={styles.listItem}
                key={notesOption.value}
                title={notesOption.label}
                right={() => (
                  <Switch
                    value={selectedFilters.includes(notesOption)}
                    onValueChange={() => onToggleSwitch(notesOption)}
                    disabled={
                      isMaxFiltersSelected &&
                      !selectedFilters.includes(notesOption)
                    }
                  />
                )}
              />
            </List.Section>
            <Divider />
            <FilterSection
              selectedFilters={selectedFilters}
              onToggleSwitch={onToggleSwitch}
              isMaxFiltersSelected={isMaxFiltersSelected}
              subheader="Symptoms"
              listItems={[anySymptomOption, ...symptomOptions]}
            />
            <Divider />
            <FilterSection
              selectedFilters={selectedFilters}
              onToggleSwitch={onToggleSwitch}
              isMaxFiltersSelected={isMaxFiltersSelected}
              subheader="Moods"
              listItems={[anyMoodOption, ...moodOptions]}
            />
            <Divider />
            <FilterSection
              selectedFilters={selectedFilters}
              onToggleSwitch={onToggleSwitch}
              isMaxFiltersSelected={isMaxFiltersSelected}
              subheader="Medications"
              listItems={[anyMedicationOption, ...medicationOptions]}
            />
            <Divider />
            <FilterSection
              selectedFilters={selectedFilters}
              onToggleSwitch={onToggleSwitch}
              isMaxFiltersSelected={isMaxFiltersSelected}
              subheader="Birth Control"
              listItems={[anyBirthControlOption, ...birthControlOptions]}
            />
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setVisible(false)}>Cancel</Button>
          <Button mode="elevated" onPress={applyFilter}>
            Apply
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chip: {
    margin: 4,
    borderRadius: 20,
    height: 36,
    justifyContent: "center",
  },
  listItem: {
    paddingVertical: Platform.OS === "android" ? 0 : undefined,
  },
});
