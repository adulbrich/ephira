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
import { useState, useEffect } from "react";
import { SettingsKeys } from "@/constants/Settings";
import { updateSetting } from "@/db/database";
import { useCalendarFilters } from "@/assets/src/calendar-storage";
import { symptomOptions, anySymptomOption } from "@/constants/Symptoms";
import { moodOptions, anyMoodOption } from "@/constants/Moods";
import {
  medicationOptions,
  anyMedicationOption,
} from "@/constants/Medications";
import {
  birthControlOptions,
  anyBirthControlOption,
} from "@/constants/BirthControlTypes";
const flowOption = { label: "Flow", value: "flow" };
const notesOption = { label: "Notes", value: "notes" };

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
              value={selectedFilters.some((f) => f.value === item.value)}
              onValueChange={() => onToggleSwitch(item)}
              disabled={
                isMaxFiltersSelected &&
                !selectedFilters.some((f) => f.value === item.value)
              }
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
  const { selectedFilters, setSelectedFilters } = useCalendarFilters();
  const [tempSelectedFilters, setTempSelectedFilters] = useState<
    {
      label: string;
      value: string;
    }[]
  >(selectedFilters);

  useEffect(() => {
    setTempSelectedFilters(selectedFilters);
  }, [selectedFilters]);

  const applyFilter = async () => {
    await updateSetting(
      SettingsKeys.calendarFilters,
      JSON.stringify(tempSelectedFilters),
    );
    setSelectedFilters(tempSelectedFilters);
    setVisible(false);
  };

  const onToggleSwitch = (filter: { label: string; value: string }) => {
    if (tempSelectedFilters.some((f) => f.value === filter.value)) {
      setTempSelectedFilters(
        tempSelectedFilters.filter((f) => f.value !== filter.value),
      );
    } else if (tempSelectedFilters.length < 3) {
      setTempSelectedFilters([...tempSelectedFilters, filter]);
    }
  };

  const isMaxFiltersSelected = tempSelectedFilters.length >= 3;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={() => setVisible(false)}>
        <Dialog.Title style={{ textAlign: "center" }}>
          Filter Calendar
        </Dialog.Title>
        <Dialog.Content>
          <Text variant="labelLarge" style={{ marginBottom: 8 }}>
            Current Filters ({tempSelectedFilters.length}/3):
          </Text>
          <View style={styles.chipContainer}>
            {tempSelectedFilters.map((filter) => (
              <Chip
                key={filter.value}
                onClose={() =>
                  setTempSelectedFilters(
                    tempSelectedFilters.filter((f) => f.value !== filter.value),
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
                    value={tempSelectedFilters.some(
                      (f) => f.value === flowOption.value,
                    )}
                    onValueChange={() => onToggleSwitch(flowOption)}
                    disabled={
                      isMaxFiltersSelected &&
                      !tempSelectedFilters.some(
                        (f) => f.value === flowOption.value,
                      )
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
                    value={tempSelectedFilters.some(
                      (f) => f.value === notesOption.value,
                    )}
                    onValueChange={() => onToggleSwitch(notesOption)}
                    disabled={
                      isMaxFiltersSelected &&
                      !tempSelectedFilters.some(
                        (f) => f.value === notesOption.value,
                      )
                    }
                  />
                )}
              />
            </List.Section>
            <Divider />
            <FilterSection
              selectedFilters={tempSelectedFilters}
              onToggleSwitch={onToggleSwitch}
              isMaxFiltersSelected={isMaxFiltersSelected}
              subheader="Symptoms"
              listItems={[anySymptomOption, ...symptomOptions]}
            />
            <Divider />
            <FilterSection
              selectedFilters={tempSelectedFilters}
              onToggleSwitch={onToggleSwitch}
              isMaxFiltersSelected={isMaxFiltersSelected}
              subheader="Moods"
              listItems={[anyMoodOption, ...moodOptions]}
            />
            <Divider />
            <FilterSection
              selectedFilters={tempSelectedFilters}
              onToggleSwitch={onToggleSwitch}
              isMaxFiltersSelected={isMaxFiltersSelected}
              subheader="Medications"
              listItems={[anyMedicationOption, ...medicationOptions]}
            />
            <Divider />
            <FilterSection
              selectedFilters={tempSelectedFilters}
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
