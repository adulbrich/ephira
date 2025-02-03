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

export default function CalendarFilterDialog({
  visible,
  setVisible,
}: {
  visible: boolean;
  setVisible: (visible: boolean) => void;
}) {
  const [selectedFilters, setSelectedFilters] = useState<string[]>(["Flow"]);

  const applyFilter = () => {
    console.log("Filtering!");
    setVisible(false);
  };

  const onToggleSwitch = (filter: string) => {
    if (selectedFilters.includes(filter)) {
      setSelectedFilters(selectedFilters.filter((f) => f !== filter));
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
                key={filter}
                onClose={() =>
                  setSelectedFilters(
                    selectedFilters.filter((f) => f !== filter)
                  )
                }
                style={{
                  margin: 4,
                  borderRadius: 20,
                  height: 36,
                  justifyContent: "center",
                }}
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
                key={"flow"}
                title={"Flow"}
                right={() => (
                  <Switch
                    value={selectedFilters.includes("Flow")}
                    onValueChange={() => onToggleSwitch("Flow")}
                    disabled={
                      isMaxFiltersSelected && !selectedFilters.includes("Flow")
                    }
                  />
                )}
              />
              <List.Item
                style={styles.listItem}
                key={"notes"}
                title={"Notes"}
                right={() => (
                  <Switch
                    value={selectedFilters.includes("Notes")}
                    onValueChange={() => onToggleSwitch("Notes")}
                    disabled={
                      isMaxFiltersSelected && !selectedFilters.includes("Notes")
                    }
                  />
                )}
              />
            </List.Section>
            <Divider />
            <List.Section>
              <List.Subheader>Symptoms</List.Subheader>
              <List.Item
                style={styles.listItem}
                key={"any_symptom"}
                title={"Any Symptom"}
                right={() => (
                  <Switch
                    value={selectedFilters.includes("Any Symptom")}
                    onValueChange={() => onToggleSwitch("Any Symptom")}
                    disabled={
                      isMaxFiltersSelected &&
                      !selectedFilters.includes("Any Symptom")
                    }
                  />
                )}
              />
              {symptomOptions.map((symptom) => (
                <List.Item
                  style={styles.listItem}
                  key={symptom.label}
                  title={symptom.label}
                  right={() => (
                    <Switch
                      value={selectedFilters.includes(symptom.label)}
                      onValueChange={() => onToggleSwitch(symptom.label)}
                      disabled={
                        isMaxFiltersSelected &&
                        !selectedFilters.includes(symptom.label)
                      }
                    />
                  )}
                />
              ))}
            </List.Section>
            <Divider />
            <List.Section>
              <List.Subheader>Moods</List.Subheader>
              {moodOptions.map((mood) => (
                <List.Item
                  style={styles.listItem}
                  key={mood.label}
                  title={mood.label}
                  right={() => (
                    <Switch
                      value={selectedFilters.includes(mood.label)}
                      onValueChange={() => onToggleSwitch(mood.label)}
                      disabled={
                        isMaxFiltersSelected &&
                        !selectedFilters.includes(mood.label)
                      }
                    />
                  )}
                />
              ))}
            </List.Section>
            <Divider />
            <List.Section>
              <List.Subheader>Medications</List.Subheader>
              {medicationOptions.map((medication) => (
                <List.Item
                  style={styles.listItem}
                  key={medication.label}
                  title={medication.label}
                  right={() => (
                    <Switch
                      value={selectedFilters.includes(medication.label)}
                      onValueChange={() => onToggleSwitch(medication.label)}
                      disabled={
                        isMaxFiltersSelected &&
                        !selectedFilters.includes(medication.label)
                      }
                    />
                  )}
                />
              ))}
            </List.Section>
            <Divider />
            <List.Section>
              <List.Subheader>Birth Control</List.Subheader>
              {birthControlOptions.map((birthControl) => (
                <List.Item
                  style={styles.listItem}
                  key={birthControl.label}
                  title={birthControl.label}
                  right={() => (
                    <Switch
                      value={selectedFilters.includes(birthControl.label)}
                      onValueChange={() => onToggleSwitch(birthControl.label)}
                      disabled={
                        isMaxFiltersSelected &&
                        !selectedFilters.includes(birthControl.label)
                      }
                    />
                  )}
                />
              ))}
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
  listItem: {
    paddingVertical: Platform.OS === "android" ? 0 : undefined,
  },
});
