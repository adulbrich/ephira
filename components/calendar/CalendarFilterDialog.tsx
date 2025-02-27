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
import {
  updateSetting,
  getAllSymptoms,
  getAllMoods,
  getAllMedications,
} from "@/db/database";
import { useCalendarFilters } from "@/assets/src/calendar-storage";
import { anySymptomOption } from "@/constants/Symptoms";
import { anyMoodOption } from "@/constants/Moods";
import { anyMedicationOption } from "@/constants/Medications";
import {
  birthControlOptions as bcData,
  anyBirthControlOption,
} from "@/constants/BirthControlTypes";
const flowOption = "Flow";
const notesOption = "Notes";

function FilterSection({
  selectedFilters,
  onToggleSwitch,
  isMaxFiltersSelected,
  subheader,
  listItems,
}: {
  selectedFilters: string[];
  onToggleSwitch: (filter: string) => void;
  isMaxFiltersSelected: boolean;
  subheader: string;
  listItems: string[];
}) {
  return (
    <List.Section>
      <List.Subheader>{subheader}</List.Subheader>
      {listItems.map((item) => (
        <List.Item
          style={styles.listItem}
          key={item}
          title={item}
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
  const { selectedFilters, setSelectedFilters } = useCalendarFilters();
  const [tempSelectedFilters, setTempSelectedFilters] =
    useState<string[]>(selectedFilters);
  const [symptomOptions, setSymptomOptions] = useState<string[]>([]);
  const [moodOptions, setMoodOptions] = useState<string[]>([]);
  const [medicationOptions, setMedicationOptions] = useState<string[]>([]);
  const [birthControlOptions, setBirthControlOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;

    const fetchSymptoms = async () => {
      const symptoms = await getAllSymptoms();
      setSymptomOptions(
        symptoms
          .filter((symptom) => symptom.visible)
          .map((symptom) => symptom.name),
      );
    };

    const fetchMoods = async () => {
      const moods = await getAllMoods();
      setMoodOptions(
        moods.filter((mood) => mood.visible).map((mood) => mood.name),
      );
    };

    const fetchMedications = async () => {
      const medications = await getAllMedications();
      setMedicationOptions(
        medications
          .filter((medication) => medication.visible)
          .map((medication) => medication.name),
      );
    };

    fetchSymptoms();
    fetchMoods();
    fetchMedications();

    // change later!!!
    setBirthControlOptions(bcData);
  }, [visible]);

  useEffect(() => {
    setTempSelectedFilters(selectedFilters);
  }, [selectedFilters]);

  const applyFilter = async () => {
    let updatedFilters = tempSelectedFilters;
    // make flow the first filter if it's included and not the first filter
    if (
      tempSelectedFilters.includes(flowOption) &&
      tempSelectedFilters[0] !== flowOption
    ) {
      updatedFilters = [
        flowOption,
        ...tempSelectedFilters.filter((f) => f !== flowOption),
      ];
    }

    await updateSetting(
      SettingsKeys.calendarFilters,
      JSON.stringify(updatedFilters),
    );
    setSelectedFilters(updatedFilters);
    setVisible(false);
  };

  const onToggleSwitch = (filter: string) => {
    if (tempSelectedFilters.includes(filter)) {
      setTempSelectedFilters(tempSelectedFilters.filter((f) => f !== filter));
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
                key={filter}
                onClose={() =>
                  setTempSelectedFilters(
                    tempSelectedFilters.filter((f) => f !== filter),
                  )
                }
                style={styles.chip}
              >
                {filter}
              </Chip>
            ))}
          </View>
          <Divider style={{ marginTop: 12 }} />
          <ScrollView style={{ maxHeight: 400 }}>
            <List.Section>
              <List.Item
                style={styles.listItem}
                key={flowOption}
                title={flowOption}
                right={() => (
                  <Switch
                    value={tempSelectedFilters.includes(flowOption)}
                    onValueChange={() => onToggleSwitch(flowOption)}
                    disabled={
                      isMaxFiltersSelected &&
                      !tempSelectedFilters.includes(flowOption)
                    }
                  />
                )}
              />
              <List.Item
                style={styles.listItem}
                key={notesOption}
                title={notesOption}
                right={() => (
                  <Switch
                    value={tempSelectedFilters.includes(notesOption)}
                    onValueChange={() => onToggleSwitch(notesOption)}
                    disabled={
                      isMaxFiltersSelected &&
                      !tempSelectedFilters.includes(notesOption)
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
