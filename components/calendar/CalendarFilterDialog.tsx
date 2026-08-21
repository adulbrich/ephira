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
import { getAllDays } from "@/db/database";
import {
  useCalendarFilters,
  useDatabaseChangeNotifier,
  usePredictionChoice,
} from "@/stores/calendar-storage";
import { anySymptomOption } from "@/constants/Symptoms";
import { anyMoodOption } from "@/constants/Moods";
import { anyMedicationOption } from "@/constants/Medications";
import { anyBirthControlOption } from "@/constants/BirthControlTypes";
import { PREDICTION_FILTER, changeFilters } from "@/db/selectedFilters";
import { useCatalogue } from "@/hooks/useCatalogue";
import { hasEnoughCyclesForPrediction } from "@/services/cyclePredictionLogic";
import type { DayData } from "@/constants/Interfaces";
const flowOption = "Flow";
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
  // The Catalogue, cached and invalidated in db/catalogue.ts. This screen used
  // to read the three tables itself and re-split medications on type, which is
  // the same knowledge that module already owns.
  const {
    symptoms: symptomOptions,
    moods: moodOptions,
    medications: medicationOptions,
    birthControl: birthControlOptions,
  } = useCatalogue();

  const [symptomsExpanded, setSymptomsExpanded] = useState(false);
  const [moodsExpanded, setMoodsExpanded] = useState(false);
  const [medicationsExpanded, setMedicationsExpanded] = useState(false);
  const [birthControlExpanded, setBirthControlExpanded] = useState(false);
  const [hasEnoughCycleData, setHasEnoughCycleData] = useState(false);

  useEffect(() => {
    setTempSelectedFilters(selectedFilters);
  }, [selectedFilters]);

  // One definition of a Cycle, per CONTEXT.md. This screen carried its own
  // gap-detection pass that never consulted is_cycle_start / is_cycle_end, so
  // marking a cycle start changed what the cycle tab and settings said and not
  // what this dialog said. cyclePredictionLogic.ts:271-277 records that same
  // defect being fixed in settings; this copy was missed.
  useEffect(() => {
    let stale = false;

    getAllDays()
      .then((allDays) => {
        if (stale) return;
        setHasEnoughCycleData(
          hasEnoughCyclesForPrediction(
            allDays.filter((day) => day.flow_intensity) as DayData[],
          ),
        );
      })
      .catch((error) => {
        console.error("Error checking cycle data:", error);
        if (!stale) setHasEnoughCycleData(false);
      });

    return () => {
      stale = true;
    };
  }, [databaseChange]);

  const applyFilter = async () => {
    // Flow-first ordering used to be written out here, and only here, which is
    // why the three other writers of this setting did not know it existed.
    setSelectedFilters(
      await changeFilters(tempSelectedFilters, {
        replace: tempSelectedFilters,
      }),
    );
    setVisible(false);
  };

  // Filters that don't consume "other" bar slots:
  // - Icon filters: birth control (star), intercourse (heart)
  // - Dedicated filters: Flow (own bar), Cycle Prediction (own bar)
  const isSpecialFilter = (filter: string) =>
    filter === intercourseOption ||
    filter === anyBirthControlOption ||
    birthControlOptions.includes(filter) ||
    filter === PREDICTION_FILTER ||
    filter === flowOption;

  const barFilterCount = tempSelectedFilters.filter(
    (f) => !isSpecialFilter(f),
  ).length;

  const onToggleSwitch = (filter: string) => {
    if (tempSelectedFilters.includes(filter)) {
      setTempSelectedFilters(tempSelectedFilters.filter((f) => f !== filter));
    } else if (isSpecialFilter(filter) || barFilterCount < 1) {
      setTempSelectedFilters([...tempSelectedFilters, filter]);
    }
  };

  const isMaxFiltersSelected = barFilterCount >= 1;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={() => setVisible(false)}>
        <Dialog.Title style={{ textAlign: "center" }}>
          Filter Calendar
        </Dialog.Title>
        <Dialog.Content>
          <Text variant="labelLarge" style={{ marginBottom: 8 }}>
            Current Filters ({barFilterCount}/1 data filter):
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
                      disabled={false}
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
              {/* Add PREDICTION_FILTER switch if predictionChoice is true AND user has enough cycle data */}
              {usePredictionChoice().predictionChoice === true &&
                hasEnoughCycleData && (
                  <List.Item
                    style={styles.listItem}
                    key={PREDICTION_FILTER}
                    title={PREDICTION_FILTER}
                    right={() => {
                      const isSelected =
                        tempSelectedFilters.includes(PREDICTION_FILTER);
                      return (
                        <Switch
                          key={`${PREDICTION_FILTER}-${isSelected}`}
                          value={isSelected}
                          onValueChange={() =>
                            onToggleSwitch(PREDICTION_FILTER)
                          }
                          disabled={false}
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
