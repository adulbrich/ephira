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
  getAllVisibleSymptoms,
  getAllVisibleMoods,
  getAllVisibleMedications,
  getAllDays,
} from "@/db/database";
import {
  useCalendarFilters,
  useDatabaseChangeNotifier,
  usePredictionChoice,
} from "@/assets/src/calendar-storage";
import { anySymptomOption } from "@/constants/Symptoms";
import { anyMoodOption } from "@/constants/Moods";
import { anyMedicationOption } from "@/constants/Medications";
import { anyBirthControlOption } from "@/constants/BirthControlTypes";
import { CYCLE_PREDICTION_CONSTANTS } from "@/constants/CyclePrediction";
const flowOption = "Flow";
const PredictionOption = "Cycle Prediction";
const notesOption = "Notes";
const StartEndOption = "Cycle Start/End";
const intercourseOption = "Intercourse";

function FilterSection({
  selectedFilters,
  onToggleSwitch,
  isMaxFiltersSelected,
  subheader,
  listItems,
  anyOption,
  expanded,
  setExpanded,
}: {
  selectedFilters: string[];
  onToggleSwitch: (filter: string) => void;
  isMaxFiltersSelected: boolean;
  subheader: string;
  listItems: string[];
  anyOption: string;
  expanded: boolean;
  setExpanded: (value: boolean) => void;
}) {
  return (
    <List.Section>
      <List.Subheader>{subheader}</List.Subheader>
      <List.Item
        style={styles.listItem}
        key={anyOption}
        title={anyOption}
        right={() => {
          const isSelected = selectedFilters.includes(anyOption);
          return (
            <Switch
              key={`${anyOption}-${isSelected}`}
              value={isSelected}
              onValueChange={() => onToggleSwitch(anyOption)}
              disabled={
                isMaxFiltersSelected && !selectedFilters.includes(anyOption)
              }
            />
          );
        }}
      />
      <List.Item
        title={expanded ? "Hide options" : "Show options"}
        onPress={() => setExpanded(!expanded)}
        left={(props) => (
          <List.Icon
            {...props}
            icon={expanded ? "chevron-up" : "chevron-down"}
          />
        )}
      />
      {expanded &&
        listItems
          .filter((item) => item !== anyOption)
          .map((item) => (
            <List.Item
              style={styles.listItem}
              key={item}
              title={item}
              right={() => {
                const isSelected = selectedFilters.includes(item);
                return (
                  <Switch
                    key={`${item}-${isSelected}`}
                    value={isSelected}
                    onValueChange={() => onToggleSwitch(item)}
                    disabled={
                      isMaxFiltersSelected && !selectedFilters.includes(item)
                    }
                  />
                );
              }}
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
  const databaseChange = useDatabaseChangeNotifier().databaseChange;
  const { selectedFilters, setSelectedFilters } = useCalendarFilters();
  const [tempSelectedFilters, setTempSelectedFilters] =
    useState<string[]>(selectedFilters);
  const [symptomOptions, setSymptomOptions] = useState<string[]>([]);
  const [moodOptions, setMoodOptions] = useState<string[]>([]);
  const [medicationOptions, setMedicationOptions] = useState<string[]>([]);
  const [birthControlOptions, setBirthControlOptions] = useState<string[]>([]);

  const [symptomsExpanded, setSymptomsExpanded] = useState(false);
  const [moodsExpanded, setMoodsExpanded] = useState(false);
  const [medicationsExpanded, setMedicationsExpanded] = useState(false);
  const [birthControlExpanded, setBirthControlExpanded] = useState(false);
  const [hasEnoughCycleData, setHasEnoughCycleData] = useState(false);

  useEffect(() => {
    const fetchSymptoms = async () => {
      const symptoms = await getAllVisibleSymptoms();
      setSymptomOptions(symptoms.map((symptom) => symptom.name));
    };

    const fetchMoods = async () => {
      const moods = await getAllVisibleMoods();
      setMoodOptions(moods.map((mood) => mood.name));
    };

    const fetchMedications = async () => {
      const medications = await getAllVisibleMedications();
      setMedicationOptions(
        medications
          .filter((medication) => medication.type !== "birth control")
          .map((medication) => medication.name),
      );
      setBirthControlOptions(
        medications
          .filter((medication) => medication.type === "birth control")
          .map((medication) => medication.name),
      );
    };

    fetchSymptoms();
    fetchMoods();
    fetchMedications();
  }, [databaseChange]);

  useEffect(() => {
    setTempSelectedFilters(selectedFilters);
  }, [selectedFilters]);

  // Check if user has enough cycle data for predictions
  useEffect(() => {
    const checkCycleData = async () => {
      try {
        const allDays = await getAllDays();
        const flowDays = allDays.filter((day) => day.flow_intensity);

        if (flowDays.length === 0) {
          setHasEnoughCycleData(false);
          return;
        }

        // Count cycles
        let cycleCount = 0;
        let consecutiveDays = 0;
        const sortedDays = flowDays.sort(
          (a, b) => new Date(a.date).valueOf() - new Date(b.date).valueOf(),
        );

        for (let i = 0; i < sortedDays.length; i++) {
          const currentDate = new Date(sortedDays[i].date);
          const nextDate =
            i < sortedDays.length - 1 ? new Date(sortedDays[i + 1].date) : null;

          consecutiveDays++;

          const isLastDay = i === sortedDays.length - 1;
          const isGap = nextDate
            ? (nextDate.getTime() - currentDate.getTime()) /
                (1000 * 60 * 60 * 24) >
              1
            : false;

          if (
            (isLastDay || isGap) &&
            consecutiveDays >= CYCLE_PREDICTION_CONSTANTS.MIN_CONSECUTIVE_DAYS
          ) {
            cycleCount++;
            consecutiveDays = 0;
          } else if (isGap) {
            consecutiveDays = 0;
          }
        }

        setHasEnoughCycleData(
          cycleCount >= CYCLE_PREDICTION_CONSTANTS.MIN_CYCLES_FOR_PREDICTION,
        );
      } catch (error) {
        console.error("Error checking cycle data:", error);
        setHasEnoughCycleData(false);
      }
    };

    checkCycleData();
  }, [databaseChange]);

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

  // Icon-based filters (birth control & intercourse) don't use bar slots
  const isIconFilter = (filter: string) =>
    filter === intercourseOption ||
    filter === anyBirthControlOption ||
    birthControlOptions.includes(filter);

  const barFilterCount = tempSelectedFilters.filter(
    (f) => !isIconFilter(f),
  ).length;

  const onToggleSwitch = (filter: string) => {
    if (tempSelectedFilters.includes(filter)) {
      setTempSelectedFilters(tempSelectedFilters.filter((f) => f !== filter));
    } else if (isIconFilter(filter) || barFilterCount < 3) {
      setTempSelectedFilters([...tempSelectedFilters, filter]);
    }
  };

  const isMaxFiltersSelected = barFilterCount >= 3;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={() => setVisible(false)}>
        <Dialog.Title style={{ textAlign: "center" }}>
          Filter Calendar
        </Dialog.Title>
        <Dialog.Content>
          <Text variant="labelLarge" style={{ marginBottom: 8 }}>
            Current Filters ({barFilterCount}/3):
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
                right={() => {
                  const isSelected = tempSelectedFilters.includes(flowOption);
                  return (
                    <Switch
                      key={`${flowOption}-${isSelected}`}
                      value={isSelected}
                      onValueChange={() => onToggleSwitch(flowOption)}
                      disabled={
                        isMaxFiltersSelected &&
                        !tempSelectedFilters.includes(flowOption)
                      }
                    />
                  );
                }}
              />
              <List.Item
                style={styles.listItem}
                key={StartEndOption}
                title={StartEndOption}
                right={() => {
                  const isSelected =
                    tempSelectedFilters.includes(StartEndOption);
                  return (
                    <Switch
                      key={`${StartEndOption}-${isSelected}`}
                      value={isSelected}
                      onValueChange={() => onToggleSwitch(StartEndOption)}
                      disabled={
                        isMaxFiltersSelected &&
                        !tempSelectedFilters.includes(StartEndOption)
                      }
                    />
                  );
                }}
              />
              {/* Add PredictionOption switch if predictionChoice is true AND user has enough cycle data */}
              {usePredictionChoice().predictionChoice === true &&
                hasEnoughCycleData && (
                  <List.Item
                    style={styles.listItem}
                    key={PredictionOption}
                    title={PredictionOption}
                    right={() => {
                      const isSelected =
                        tempSelectedFilters.includes(PredictionOption);
                      return (
                        <Switch
                          key={`${PredictionOption}-${isSelected}`}
                          value={isSelected}
                          onValueChange={() => onToggleSwitch(PredictionOption)}
                          disabled={
                            isMaxFiltersSelected &&
                            !tempSelectedFilters.includes(PredictionOption)
                          }
                        />
                      );
                    }}
                  />
                )}
            </List.Section>
            <Divider />
            <FilterSection
              selectedFilters={tempSelectedFilters}
              onToggleSwitch={onToggleSwitch}
              isMaxFiltersSelected={false}
              subheader="Birth Control"
              listItems={[anyBirthControlOption, ...birthControlOptions]}
              anyOption={anyBirthControlOption}
              expanded={birthControlExpanded}
              setExpanded={setBirthControlExpanded}
            />
            <Divider />
            <List.Section>
              <List.Item
                style={styles.listItem}
                key={intercourseOption}
                title={intercourseOption}
                right={() => {
                  const isSelected =
                    tempSelectedFilters.includes(intercourseOption);
                  return (
                    <Switch
                      key={`${intercourseOption}-${isSelected}`}
                      value={isSelected}
                      onValueChange={() => onToggleSwitch(intercourseOption)}
                    />
                  );
                }}
              />
            </List.Section>
            <Divider />
            <FilterSection
              selectedFilters={tempSelectedFilters}
              onToggleSwitch={onToggleSwitch}
              isMaxFiltersSelected={isMaxFiltersSelected}
              subheader="Symptoms"
              listItems={[anySymptomOption, ...symptomOptions]}
              anyOption={anySymptomOption}
              expanded={symptomsExpanded}
              setExpanded={setSymptomsExpanded}
            />
            <Divider />
            <FilterSection
              selectedFilters={tempSelectedFilters}
              onToggleSwitch={onToggleSwitch}
              isMaxFiltersSelected={isMaxFiltersSelected}
              subheader="Moods"
              listItems={[anyMoodOption, ...moodOptions]}
              anyOption={anyMoodOption}
              expanded={moodsExpanded}
              setExpanded={setMoodsExpanded}
            />
            <Divider />
            <FilterSection
              selectedFilters={tempSelectedFilters}
              onToggleSwitch={onToggleSwitch}
              isMaxFiltersSelected={isMaxFiltersSelected}
              subheader="Medications"
              listItems={[anyMedicationOption, ...medicationOptions]}
              anyOption={anyMedicationOption}
              expanded={medicationsExpanded}
              setExpanded={setMedicationsExpanded}
            />
            <Divider />
            <List.Section>
              <List.Item
                style={styles.listItem}
                key={notesOption}
                title={notesOption}
                right={() => {
                  const isSelected = tempSelectedFilters.includes(notesOption);
                  return (
                    <Switch
                      key={`${notesOption}-${isSelected}`}
                      value={isSelected}
                      onValueChange={() => onToggleSwitch(notesOption)}
                      disabled={
                        isMaxFiltersSelected &&
                        !tempSelectedFilters.includes(notesOption)
                      }
                    />
                  );
                }}
              />
            </List.Section>
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
