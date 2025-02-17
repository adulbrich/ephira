import { useState, useEffect, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { insertDay, getDay } from "@/db/database";
import { List, Button, Text, useTheme, Divider } from "react-native-paper";
import {
  useAccordion,
  useMoods,
  useSelectedDate,
  useSymptoms,
  useMedications,
  useBirthControl,
  useBirthControlNotes,
  useTimeTaken,
} from "@/assets/src/calendar-storage";
import FlowAccordion from "@/components/dayView/FlowAccordion";
import MedicationsAccordion from "./MedicationsAccordion";
import BirthControlAccordion from "./BirthControlAccordion";
import SymptomsAccordion from "./SymptomsAccordion";
import MoodsAccordion from "./MoodsAccordion";
import NotesAccordion from "./NotesAccordion";
import SaveMessage from "./SaveMessage";
import { useSyncEntries } from "@/hooks/useSyncEntries";
import { useFetchEntries } from "@/hooks/useFetchEntries";
import { useFetchMedicationEntries } from "@/hooks/useFetchMedicationEntries";
import { useSyncMedicationEntries } from "@/hooks/useSyncMedicationEntries";

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

  const { syncEntries } = useSyncEntries(date);
  const { fetchEntries } = useFetchEntries(
    date,
    setSelectedSymptoms,
    setSelectedMoods,
  );
  const { syncMedicationEntries } = useSyncMedicationEntries(date);
  const { fetchMedicationEntries } = useFetchMedicationEntries(
    date,
    setSelectedBirthControl,
    setSelectedMedications,
    setBirthControlNotes,
    setTimeTaken,
  );

  const [saveMessageVisible, setSaveMessageVisible] = useState(false);
  const [saveMessageContent, setSaveMessageContent] = useState<string[]>([]);

  const fetchNotes = useCallback(async () => {
    const day = await getDay(date);
    if (day && day.notes) {
      setNotes(day.notes);
    } else {
      setNotes("");
    }
  }, [date, setNotes]);

  function onSave() {
    insertDay(date, flow_intensity, notes).then(async () => {
      setFlow(flow_intensity);
      setExpandedAccordion(null);

      await syncEntries(selectedSymptoms, "symptom");
      await syncEntries(selectedMoods, "mood");
      
      if (selectedBirthControl != null) {
        selectedMedications.push(selectedBirthControl);
      }

      await syncMedicationEntries(
        selectedMedications,
        timeTaken,
        birthControlNotes,
      );

      await fetchEntries("symptom");
      await fetchEntries("mood");
      await fetchMedicationEntries();
      await fetchNotes();

      const contentToSave: string[] = [];
      if (flow_intensity !== 0) {
        contentToSave.push("Flow");
      }
      if (notes && notes.trim() !== "") {
        contentToSave.push("Notes");
      }
      if (selectedSymptoms.length > 0) {
        contentToSave.push("Symptoms");
      }
      if (selectedMoods.length > 0) {
        contentToSave.push("Moods");
      }
      if (selectedMedications.length > 0) {
        contentToSave.push("Medications");
      }
      if (selectedBirthControl) {
        contentToSave.push("Birth Control");
      }
      
      if (contentToSave.length > 0) {
        let message = "";
        if (contentToSave.length === 1) {
          message = contentToSave[0] + " Saved!";
        } else if (contentToSave.length === 2) {
          message = contentToSave[0] + " and " + contentToSave[1] + " Saved!";
        } else {
          // If user selects three or more tracking options, join with commas and add an "and" before the last item
          const allButLast = contentToSave.slice(0, -1).join(", ");
          message = allButLast + " and " + contentToSave[contentToSave.length - 1] + " Saved!";
        }
        setSaveMessageContent([message]);
        setSaveMessageVisible(true);
      }

    });
  }

  useEffect(() => {
    if (flow_intensity !== null) {
      setFlow(flow_intensity);
    }
  }, [flow_intensity, setFlow]);

  useEffect(() => {
    fetchEntries("symptom");
    fetchEntries("mood");
    fetchMedicationEntries();
    fetchNotes();
    setExpandedAccordion(null);
  }, [fetchEntries, fetchNotes, fetchMedicationEntries, setExpandedAccordion]);

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
          <FlowAccordion
            state={state}
            setExpandedAccordion={setExpandedAccordion}
            flow_intensity={flow_intensity}
            setFlow={setFlow}
          />
          <Divider />
          <SymptomsAccordion
            state={state}
            setExpandedAccordion={setExpandedAccordion}
            selectedSymptoms={selectedSymptoms}
            setSelectedSymptoms={setSelectedSymptoms}
          />
          <Divider />
          <MoodsAccordion
            state={state}
            setExpandedAccordion={setExpandedAccordion}
            selectedMoods={selectedMoods}
            setSelectedMoods={setSelectedMoods}
          />
          <Divider />
          <MedicationsAccordion
            state={state}
            setExpandedAccordion={setExpandedAccordion}
            selectedMedications={selectedMedications}
            setSelectedMedications={setSelectedMedications}
          />
          <Divider />
          <BirthControlAccordion
            state={state}
            setExpandedAccordion={setExpandedAccordion}
            selectedBirthControl={selectedBirthControl}
            setSelectedBirthControl={setSelectedBirthControl}
          />
          <Divider />
          <NotesAccordion
            state={state}
            setExpandedAccordion={setExpandedAccordion}
            notes={notes}
            setNotes={setNotes}
          />
        </List.Section>
      </View>
      <SaveMessage
        visible={saveMessageVisible}
        content={saveMessageContent}
        onDismiss={() => setSaveMessageVisible(false)}
      />
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
});