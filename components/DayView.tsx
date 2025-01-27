import { useEffect, useCallback } from "react";
import { StyleSheet, View, Platform, Modal } from "react-native";
import {
  insertDay,
  insertSymptom,
  insertMood,
  getDay,
  getSymptom,
  getMood,
  getSymptomEntriesForDay,
  getMoodEntriesForDay,
  getSymptomByID,
  getMoodByID,
  deleteSymptomEntry,
  deleteMoodEntry,
  insertSymptomEntry,
  insertMoodEntry,
  getMedicationEntriesForDay,
  insertMedication,
  insertMedicationEntry,
  deleteMedicationEntry,
  getMedication,
  getMedicationByID,
} from "@/db/database";
import {
  List,
  Button,
  Text,
  useTheme,
  RadioButton,
  Divider,
  TextInput,
  Chip,
} from "react-native-paper";
import { symptomOptions } from "@/constants/Symptoms";
import { moodOptions } from "@/constants/Moods";
import { medicationOptions } from "@/constants/Medications";
import { birthControlOptions } from "@/constants/BirthControlTypes";
import {
  useAccordion,
  useMoods,
  useSelectedDate,
  useSymptoms,
  useMedications,
  useBirthControl,
  useBirthControlNotes,
  useTimeTaken,
  useTimePickerState,
  useTempSelectedTime,
} from "@/assets/src/calendar-storage";
import DateTimePicker from "@react-native-community/datetimepicker";

const flowOptions = ["None", "Spotting", "Light", "Medium", "Heavy"];

// radio buttons adapted from code generated by ChatGPT-4o
function FlowRadioButtons({
  selectedOption,
  setSelectedOption,
}: {
  selectedOption: number;
  setSelectedOption: (option: number) => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ width: "100%" }}>
      <RadioButton.Group
        value={flowOptions[selectedOption]}
        onValueChange={(value) => setSelectedOption(flowOptions.indexOf(value))}
      >
        {flowOptions.map((button, index) => (
          <RadioButton.Item
            key={button}
            label={button}
            value={button}
            labelStyle={{
              color:
                selectedOption === index
                  ? theme.colors.onSecondaryContainer
                  : theme.colors.onSurfaceVariant,
            }}
          ></RadioButton.Item>
        ))}
      </RadioButton.Group>
    </View>
  );
}

function ChipSelection({
  options,
  selectedValues,
  setSelectedValues,
  label,
}: {
  options: { label: string; value: string }[];
  selectedValues: string[];
  setSelectedValues: (values: string[]) => void;
  label: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ padding: 16 }}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.chipContainer}>
        {options.map((option) => (
          <Chip
            mode="outlined"
            key={option.value}
            selected={selectedValues.includes(option.value)}
            showSelectedCheck={false}
            onPress={() => {
              setSelectedValues(
                selectedValues.includes(option.value)
                  ? selectedValues.filter((val) => val !== option.value)
                  : [...selectedValues, option.value],
              );
            }}
            style={{
              backgroundColor: selectedValues.includes(option.value)
                ? theme.colors.onSecondary
                : theme.colors.secondary,
              margin: 4,
            }}
            textStyle={{
              color: selectedValues.includes(option.value)
                ? theme.colors.onSecondaryContainer
                : theme.colors.secondaryContainer,
            }}
          >
            {option.label}
          </Chip>
        ))}
      </View>
    </View>
  );
}

function SingleSelectChipSelection({
  options,
  selectedValue,
  setSelectedValue,
  label,
}: {
  options: { label: string; value: string }[];
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
            mode="outlined"
            key={option.value}
            selected={selectedValue === option.value}
            showSelectedCheck={false}
            onPress={() =>
              setSelectedValue(selectedValue === option.value ? null : option.value)
            }
            style={{
              backgroundColor: selectedValue === option.value
                ? theme.colors.onSecondary
                : theme.colors.secondary,
              margin: 4,
            }}
            textStyle={{
              color: selectedValue === option.value
                ? theme.colors.onSecondaryContainer
                : theme.colors.secondaryContainer,
            }}
          >
            {option.label}
          </Chip>
        ))}
      </View>
    </View>
  );
}

export default function DayView() {
  const theme = useTheme();
  const { state, setExpandedAccordion } = useAccordion();

  const { selectedMoods, setSelectedMoods } = useMoods();
  const { date, flow_intensity, notes, setFlow, setNotes } = useSelectedDate();
  const { selectedSymptoms, setSelectedSymptoms } = useSymptoms();
  const { selectedMedications, setSelectedMedications } = useMedications();
  const { selectedBirthControl, setSelectedBirthControl } = useBirthControl();
  const { birthControlNotes, setBirthControlNotes } = useBirthControlNotes();
  const { timeTaken, setTimeTaken } = useTimeTaken();
  const { showTimePicker, setShowTimePicker } = useTimePickerState();
  const { tempSelectedTime, setTempSelectedTime } = useTempSelectedTime();

  const renderBirthControlUI = () => {

    const theme = useTheme();

    useEffect(() => {
      if (selectedBirthControl !== "pill") {
        setTimeTaken("");
        setShowTimePicker(false);
      }
    }, [selectedBirthControl]);
    
    const handleTimeChange = (event: any, selectedTime?: Date) => {
      if (selectedTime) {
        setTempSelectedTime(selectedTime);
      }
    };
  
    const finalizeTimeSelection = () => {
      // If no time has been selected, use the current time
      const finalTime = tempSelectedTime || new Date();
      const hours = finalTime.getHours();
      const minutes = finalTime.getMinutes();
      const isPM = hours >= 12;
      const formattedHours = hours % 12 || 12; // Convert to 12-hour format
      const formattedMinutes = minutes.toString().padStart(2, "0");
      const period = isPM ? "PM" : "AM";
  
      const formattedTime = `${formattedHours}:${formattedMinutes} ${period}`;
      setTimeTaken(formattedTime); 
      setTempSelectedTime(null);
      setShowTimePicker(false);
    };
  
    const cancelTimeSelection = () => {
      setTempSelectedTime(null);
      setShowTimePicker(false);
      setTimeTaken("");
    };

    const birthControlNotesInput = (
      <View>
        <Text style={styles.text}>Notes</Text>
        <TextInput
          placeholder="Enter notes, reminders, appointments, etc."
          value={birthControlNotes}
          onChangeText={setBirthControlNotes}
        />
      </View>
    );

    const renderPillUI = (
      <View>
        <Button mode="elevated" 
          onPress={() => setShowTimePicker(true)} 
          textColor= {theme.colors.onSecondary}
          buttonColor= {theme.colors.secondary}
          style={{ flex: 1 }}
        >
          {timeTaken !== "" ? `Time Taken: ${timeTaken}` : "Select Time Taken"}
        </Button>
        <Modal
          visible={showTimePicker}
          animationType="fade"
          transparent={true}
          onRequestClose={cancelTimeSelection} // Ensures modal closes on hardware back press (Android)
        >
          <View style={{ 
            flex: 1, 
            justifyContent: "center", 
            alignItems: "center", 
            backgroundColor: "rgba(0, 0, 0, 0.5)" 
          }}>
            <View style={{ 
              backgroundColor: theme.colors.onSecondary, 
              padding: 20, 
              borderRadius: 10, 
              width: "80%", 
              alignItems: "center" 
            }}>
              <View>
                <DateTimePicker
                  value={tempSelectedTime || new Date()} // Default to current time if no tempSelectedTime
                  mode="time"
                  is24Hour={false} // 12-hour format
                  display={Platform.OS === "ios" ? "spinner" : "clock"}
                  onChange={handleTimeChange}
                  style={{ alignSelf: "center", width: "100%", paddingHorizontal: 10 }}
                />
              </View>
              <View style={{ 
                flexDirection: "row", 
                justifyContent: "space-between", 
                marginTop: 8, 
                width: "100%" 
              }}>
                <Button mode="elevated" 
                  onPress={cancelTimeSelection} 
                  textColor= {theme.colors.onSecondary}
                  buttonColor= {theme.colors.secondary}
                  style={{ flex: 1, marginLeft: 10 }}
                >
                  Cancel
                </Button>
                <Button mode="elevated" 
                  onPress={finalizeTimeSelection} 
                  textColor= {theme.colors.onSecondary}
                  buttonColor= {theme.colors.secondary}
                  style={{ flex: 1, marginLeft: 10 }}
                >
                  Done
                </Button>
              </View>
            </View>
          </View>
        </Modal>
        {birthControlNotesInput}
      </View>
    );

    const renderNotesUI = (
      <View>
        {birthControlNotesInput}
      </View>
    );

    switch (selectedBirthControl) {
      case "pill":
        return renderPillUI;
      case "iud":
      case "ring":
      case "patch":
      case "shot":
      case "implant":
        return renderNotesUI;
      default:
        return <Text style={styles.text}>Select a birth control option to see details.</Text>;
    }
  };

  const selectedBirthControlLabel = 
    birthControlOptions.find((option) => option.value === selectedBirthControl)
    ?.label || "None";

  const syncMedicationEntries = async (selectedValues: string[], time_taken?: string, notes?: string, ) => {
    const day = await getDay(date);
    if (!day) return;

    const existingEntries = await getMedicationEntriesForDay(day.id);

    const insertEntry = async (dayId: number, itemId: number, time_taken?: string, notes?: string) =>
      insertMedicationEntry(dayId, itemId, time_taken, notes);

    const deleteEntry = (entryId: number) => deleteMedicationEntry(entryId);

    const getItem = getMedication;
    const insertItem = insertMedication;

    for (const value of selectedValues) {
      let item = await getItem(value);
      if (!item) {
        await insertItem(value, true);
        item = await getItem(value);
      }
      if (item) {
        const isBirthControl = birthControlOptions.find((option) => option.value === value);
        if (isBirthControl) {
          console.log("isBirthControl is true");
          await insertEntry(day.id, item.id, time_taken, notes);
        } else {
          console.log("isBirthControl is false");
          await insertEntry(day.id, item.id); 
        }
      }
    }

    const selectedIds = await Promise.all(
      selectedValues.map(async (value) => {
        const item = await getItem(value);
        return item?.id ?? null;
      }),
    );

    const validIds = selectedIds.filter((id) => id !== null);

    for (const entry of existingEntries) {
      const entryId = (entry as { medication_id: number }).medication_id;
      if (!validIds.includes(entryId)) {
        await deleteEntry(entry.id);
      }
    }
  };
  
  const fetchMedicationEntries = async () => {
    const day = await getDay(date);
    if (!day) {
      setSelectedBirthControl(null);
      setSelectedMedications([]);
      setBirthControlNotes("");
      return;
    }
  
    const entries = await getMedicationEntriesForDay(day.id);
    const values = await Promise.all(
      entries.map(async (entry) => {
        const item = await getMedicationByID(entry.medication_id);
        return {
          name: item?.name ?? null,
          notes: entry.notes ?? null,
        }
      }),
    );
  
    const filteredValues = values.filter((value) => value.name !== null) as {
      name: string;
      notes: string | null;
    }[];

    const birthControlEntry = filteredValues.find((value) =>
      birthControlOptions.some((option) => option.value === value.name)
    );

    if (birthControlEntry) {
      setSelectedBirthControl(birthControlEntry.name);
      if (birthControlEntry.notes !== null)
      {
        setBirthControlNotes(birthControlEntry.notes);
      } else {
        setBirthControlNotes("");
      }
      console.log("Birth Control Notes: ", birthControlEntry.notes);
    } else {
      setSelectedBirthControl(null);
    }
    
    const medicationsWithoutBirthControl = filteredValues
      .filter((value) => !birthControlOptions.some((option) => option.value === value.name))
      .map((value) => value.name);

    setSelectedMedications(medicationsWithoutBirthControl);
    console.log("Medications Without Birth Control: ", medicationsWithoutBirthControl);
  };

  const syncEntries = async (
    selectedValues: string[],
    type: "symptom" | "mood",
  ) => {
    const day = await getDay(date);
    if (!day) return;

    const existingEntries =
      type === "symptom"
        ? await getSymptomEntriesForDay(day.id)
        : await getMoodEntriesForDay(day.id);

    const insertEntry =
      type === "symptom" ? insertSymptomEntry : insertMoodEntry;
    const deleteEntry =
      type === "symptom" ? deleteSymptomEntry : deleteMoodEntry;
    const getItem = type === "symptom" ? getSymptom : getMood;
    const insertItem = type === "symptom" ? insertSymptom : insertMood;

    for (const value of selectedValues) {
      let item = await getItem(value);
      if (!item) {
        await insertItem(value, true);
        item = await getItem(value);
      }
      if (item) {
        await insertEntry(day.id, item.id);
      }
    }

    const selectedIds = await Promise.all(
      selectedValues.map(async (value) => {
        const item =
          type === "symptom" ? await getSymptom(value) : await getMood(value);
        return item?.id ?? null;
      }),
    );

    const validIds = selectedIds.filter((id) => id !== null);
    for (const entry of existingEntries) {
      const entryId =
        type === "symptom"
          ? (entry as { symptom_id: number }).symptom_id
          : (entry as { mood_id: number }).mood_id;
      if (
        (type === "symptom" && !validIds.includes(entryId)) ||
        (type === "mood" && !validIds.includes(entryId))
      ) {
        await deleteEntry(entry.id);
      }
    }
  };

  const fetchEntries = useCallback(
    async (type: "symptom" | "mood") => {
      const getEntries =
        type === "symptom" ? getSymptomEntriesForDay : getMoodEntriesForDay;
      const getById = type === "symptom" ? getSymptomByID : getMoodByID;
      const setSelected =
        type === "symptom" ? setSelectedSymptoms : setSelectedMoods;

      const day = await getDay(date);
      if (!day) {
        setSelected([]);
        return;
      }

      const entries = await getEntries(day.id);
      const values = await Promise.all(
        entries.map(async (entry) => {
          const id =
            type === "symptom"
              ? (entry as { symptom_id: number }).symptom_id
              : (entry as { mood_id: number }).mood_id;
          const item = await getById(id);
          return item?.name ?? null;
        }),
      );
      setSelected(values.filter((value) => value !== null) as string[]);
    },
    [date], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const fetchNotes = useCallback(async () => {
    const day = await getDay(date);
    if (day && day.notes) {
      setNotes(day.notes);
    } else {
      setNotes("");
    }
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSave() {
    insertDay(date, flow_intensity, notes).then(async () => {
      setFlow(flow_intensity);
      setExpandedAccordion(null);

      await syncEntries(selectedSymptoms, "symptom");
      await syncEntries(selectedMoods, "mood");
      if (selectedBirthControl != null) {
        selectedMedications.push(selectedBirthControl);
      }
      await syncMedicationEntries(selectedMedications, timeTaken, birthControlNotes);
      await fetchEntries("symptom");
      await fetchEntries("mood");
      await fetchMedicationEntries();
      await fetchNotes();
    });
  }

  useEffect(() => {
    setFlow(flow_intensity);
    fetchEntries("symptom");
    fetchEntries("mood");
    fetchMedicationEntries();
    fetchNotes();
    setExpandedAccordion(null);
  }, [setFlow, fetchEntries, fetchNotes]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      <View style={styles.titleContainer}>
        <Text variant="titleLarge">
          {new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          }).format(new Date(date + "T00:00:00"))}
        </Text>
        <Button mode="elevated" onPress={() => onSave()}>
          Save
        </Button>
      </View>
      <View>
        <List.Section>
          <List.Accordion
            title={"Flow Intensity   |   " + flowOptions[flow_intensity]}
            expanded={state === "flow"}
            onPress={() =>
              setExpandedAccordion(state === "flow" ? null : "flow")
            }
            left={(props) => <List.Icon {...props} icon="water" />}
          >
            <FlowRadioButtons
              selectedOption={flow_intensity}
              setSelectedOption={setFlow}
            />
          </List.Accordion>
          <Divider />
          <List.Accordion
            title={"Symptoms   |   " + selectedSymptoms.length + " Selected"}
            expanded={state === "symptoms"}
            onPress={() =>
              setExpandedAccordion(state === "symptoms" ? null : "symptoms")
            }
            left={(props) => <List.Icon {...props} icon="alert-decagram" />}
          >
            <ChipSelection
              options={symptomOptions}
              selectedValues={selectedSymptoms}
              setSelectedValues={setSelectedSymptoms}
              label="Select Symptoms:"
            />
          </List.Accordion>
          <Divider />
          <List.Accordion
            title={"Moods   |   " + selectedMoods.length + " Selected"}
            expanded={state === "mood"}
            onPress={() =>
              setExpandedAccordion(state === "mood" ? null : "mood")
            }
            left={(props) => <List.Icon {...props} icon="emoticon" />}
          >
            <ChipSelection
              options={moodOptions}
              selectedValues={selectedMoods}
              setSelectedValues={setSelectedMoods}
              label="Select Moods:"
            />
          </List.Accordion>
          <Divider />
          <List.Accordion
            title={"Birth Control   |   " + selectedBirthControlLabel}
            expanded={state === "birthControl"}
            onPress={() =>
              setExpandedAccordion(state === "birthControl" ? null : "birthControl")
            }
            left={(props) => <List.Icon {...props} icon="shield-check" />}
          >
            <SingleSelectChipSelection
              options={birthControlOptions}
              selectedValue={selectedBirthControl}
              setSelectedValue={setSelectedBirthControl}
              label="Select Birth Control Type:"
            />
            <View style={{ padding: 16 }}>{renderBirthControlUI()}</View>
          </List.Accordion>
          <Divider />
          <List.Accordion
            title="Medications"
            expanded={state === "medications"}
            onPress={() =>
              setExpandedAccordion(
                state === "medications" ? null : "medications",
              )
            }
            left={(props) => <List.Icon {...props} icon="pill" />}
          >
            <ChipSelection
              options={medicationOptions}
              selectedValues={selectedMedications}
              setSelectedValues={setSelectedMedications}
              label="Select Medications:"
            />
          </List.Accordion>
          <Divider />
          <List.Accordion
            title="Notes"
            expanded={state === "notes"}
            onPress={() =>
              setExpandedAccordion(state === "notes" ? null : "notes")
            }
            left={(props) => <List.Icon {...props} icon="note" />}
          >
            <View style={{ padding: 16 }}>
              <TextInput
                label="Notes"
                value={notes}
                onChangeText={(notes) => setNotes(notes)}
                placeholder="Add Notes..."
              />
            </View>
          </List.Accordion>
        </List.Section>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: "400",
    margin: 8,
  }
});
