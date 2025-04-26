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
import Snackbar from "@/components/ui/Snackbar";
import { useSyncEntries } from "@/hooks/useSyncEntries";
import { useFetchEntries } from "@/hooks/useFetchEntries";
import { useFetchMedicationEntries } from "@/hooks/useFetchMedicationEntries";
import { useSyncMedicationEntries } from "@/hooks/useSyncMedicationEntries";
import { useFocusEffect } from "expo-router";

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

  const onSave = useCallback(() => {
    insertDay(date, flow_intensity, notes).then(async () => {
      setFlow(flow_intensity);
  
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
  
    });
  }, [
    date,
    flow_intensity,
    notes,
    selectedSymptoms,
    selectedMoods,
    selectedMedications,
    selectedBirthControl,
    timeTaken,
    birthControlNotes,
    syncEntries,
    syncMedicationEntries,
    fetchEntries,
    fetchMedicationEntries,
    fetchNotes,
    setFlow,
    setExpandedAccordion,
  ]);

  useEffect(() => {
    if (flow_intensity !== null) {
      setFlow(flow_intensity);
    }
  }, [flow_intensity, setFlow]);

  // Set accordions to closed when screen is focused
  useFocusEffect(
    useCallback(() => {
      setExpandedAccordion(null);
    }, [])
  );

  type SavedData = {
    date: string;
    flow: number;
    notes: string;
    symptoms: string[];
    moods: string[];
    medications: string[];
    birthControl: string | null;
    birthControlNotes: string;
    timeTaken: string;
  };

  const [lastSavedData, setLastSavedData] = useState<SavedData | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      await fetchEntries("symptom");
      await fetchEntries("mood");
      await fetchMedicationEntries();
      await fetchNotes();
  
      const existingDay = await getDay(date);

      // Populate lastSavedData for auto-saving
      setLastSavedData({
        date: existingDay?.date ?? "",
        flow: existingDay?.flow_intensity ?? 0,
        notes: existingDay?.notes ?? "",
        symptoms: [...selectedSymptoms],
        moods: [...selectedMoods],
        medications: [...selectedMedications],
        birthControl: selectedBirthControl,
        birthControlNotes,
        timeTaken,
      });
    };
  
    fetchAll();
    setExpandedAccordion(null);
  }, [date]);
  
  const hasChanged = (newData: SavedData, oldData: SavedData) => {
    const normalize = (data: SavedData) => ({
      ...data,
      symptoms: [...data.symptoms].sort(),
      moods: [...data.moods].sort(),
      medications: [...data.medications].sort(),
      notes: data.notes.trim(),
      birthControlNotes: data.birthControlNotes.trim(),
      timeTaken: data.timeTaken.trim(),
    });
  
    const a = normalize(newData);
    const b = normalize(oldData);
  
    return JSON.stringify(a) !== JSON.stringify(b);
  };  
  
  // Check if should save when data changes
  useEffect(() => {
    if (!lastSavedData) return;

    // Don't compare or save if the date selected has changed
    if (lastSavedData.date !== date) return;
  
    const currentData = {
      date: date ?? "",
      flow: flow_intensity,
      notes: notes ?? "",
      symptoms: selectedSymptoms,
      moods: selectedMoods,
      medications: selectedMedications,
      birthControl: selectedBirthControl,
      birthControlNotes,
      timeTaken,
    };
  
    if (hasChanged(currentData, lastSavedData)) {
      onSave();
      setLastSavedData(currentData); // Update lastSavedData
    }
  }, [
    flow_intensity,
    notes,
    selectedSymptoms,
    selectedMoods,
    selectedMedications,
    selectedBirthControl,
    birthControlNotes,
    timeTaken,
  ]);
  

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
        {/* <Button
          mode="elevated"
          buttonColor={theme.colors.primaryContainer}
          textColor={theme.colors.onPrimaryContainer}
          onPress={() => onSave()}
        >
          Save
        </Button> */}
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
      <Snackbar
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
