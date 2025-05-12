import { useState, useEffect, useCallback, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { insertDay, getDay } from "@/db/database";
import { List, Text, useTheme, Divider } from "react-native-paper";
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
  const { date, flow_intensity, notes, setFlow, setNotes, is_cycle_start, setCycleStart, is_cycle_end, setCycleEnd } = useSelectedDate();
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

  const fetchNotes = useCallback(async () => {
    const day = await getDay(date);
    if (day && day.notes) {
      setNotes(day.notes);
    } else {
      setNotes("");
    }
  }, [date, setNotes]);

  const [saveMessageVisible, setSaveMessageVisible] = useState(false);
  const [saveMessageContent, setSaveMessageContent] = useState<string[]>([]);

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
  const isSavingRef = useRef(false);
  const initialLoadComplete = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchEntriesRef = useRef(fetchEntries);
  const fetchMedicationEntriesRef = useRef(fetchMedicationEntries);
  const fetchNotesRef = useRef(fetchNotes);
  const selectedSymptomsRef = useRef(selectedSymptoms);
  const selectedMoodsRef = useRef(selectedMoods);
  const selectedMedicationsRef = useRef(selectedMedications);
  const selectedBirthControlRef = useRef(selectedBirthControl);
  const birthControlNotesRef = useRef(birthControlNotes);
  const timeTakenRef = useRef(timeTaken);

  useEffect(() => {
    fetchEntriesRef.current = fetchEntries;
    fetchMedicationEntriesRef.current = fetchMedicationEntries;
    fetchNotesRef.current = fetchNotes;
    selectedSymptomsRef.current = selectedSymptoms;
    selectedMoodsRef.current = selectedMoods;
    selectedMedicationsRef.current = selectedMedications;
    selectedBirthControlRef.current = selectedBirthControl;
    birthControlNotesRef.current = birthControlNotes;
    timeTakenRef.current = timeTaken;
  }, [
    fetchEntries,
    fetchMedicationEntries,
    fetchNotes,
    selectedSymptoms,
    selectedMoods,
    selectedMedications,
    selectedBirthControl,
    birthControlNotes,
    timeTaken,
  ]);

  const onSave = useCallback(() => {
    if (isSavingRef.current) return; // prevent re-entry
    isSavingRef.current = true;

    try {
      insertDay(date, flow_intensity, notes).then(async () => {
        setFlow(flow_intensity);

        await syncEntries(selectedSymptoms, "symptom");
        await syncEntries(selectedMoods, "mood");

        let combinedMedications = selectedMedications;

        if (selectedBirthControl != null) {
          combinedMedications = [...selectedMedications, selectedBirthControl];
        }

        await syncMedicationEntries(
          combinedMedications,
          timeTaken,
          birthControlNotes,
        );

        await fetchEntries("symptom");
        await fetchEntries("mood");
        await fetchMedicationEntries();
        await fetchNotes();

        setSaveMessageVisible(false);

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
            const multipleSelections = contentToSave.slice(0, -1).join(", ");
            message =
              multipleSelections +
              " and " +
              contentToSave[contentToSave.length - 1] +
              " Saved!";
          }
          setSaveMessageContent([message]);
          setSaveMessageVisible(true);
        }
      });
    } finally {
      isSavingRef.current = false;
    }
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
  ]);

  useEffect(() => {
    if (flow_intensity !== null) {
      setFlow(flow_intensity);
    }
  }, [flow_intensity, setFlow]);

  // set accordions to closed when screen is focused
  useFocusEffect(
    useCallback(() => {
      setExpandedAccordion(null);
    }, [setExpandedAccordion]),
  );

  useEffect(() => {
    const fetchAll = async () => {
      await fetchEntriesRef.current("symptom");
      await fetchEntriesRef.current("mood");
      await fetchMedicationEntriesRef.current();
      await fetchNotesRef.current();

      const existingDay = await getDay(date);
      const isNewDay = !existingDay;

      setLastSavedData({
        date: date,
        flow: existingDay?.flow_intensity ?? 0,
        notes: existingDay?.notes ?? "",
        symptoms: isNewDay ? [] : [...selectedSymptomsRef.current],
        moods: isNewDay ? [] : [...selectedMoodsRef.current],
        medications: isNewDay ? [] : [...selectedMedicationsRef.current],
        birthControl: isNewDay ? null : selectedBirthControlRef.current,
        birthControlNotes: isNewDay ? "" : birthControlNotesRef.current,
        timeTaken: isNewDay ? "" : timeTakenRef.current,
      });

      initialLoadComplete.current = true;
    };

    fetchAll();
    setExpandedAccordion(null);
  }, [date, setExpandedAccordion]);

  const hasChanged = useCallback((newData: SavedData, oldData: SavedData) => {
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
  }, []);

  const onSaveRef = useRef(onSave);
  const hasChangedRef = useRef(hasChanged);
  const lastSavedDataRef = useRef(lastSavedData);

  useEffect(() => {
    onSaveRef.current = onSave;
    hasChangedRef.current = hasChanged;
    lastSavedDataRef.current = lastSavedData;
  }, [onSave, hasChanged, lastSavedData]);

  // debounced auto-save
  useEffect(() => {
    if (!date) return;

    const currentData = {
      date,
      flow: flow_intensity,
      notes: notes ?? "",
      symptoms: selectedSymptoms,
      moods: selectedMoods,
      medications: selectedMedications,
      birthControl: selectedBirthControl,
      birthControlNotes,
      timeTaken,
    };

    // skip auto-saving on initial component load
    if (!initialLoadComplete.current) return;

    // skip auto-saving if selected date has changed since last save
    if (lastSavedDataRef.current?.date !== date) return;

    if (
      !lastSavedDataRef.current ||
      hasChangedRef.current(currentData, lastSavedDataRef.current)
    ) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        onSaveRef.current();
        setLastSavedData(currentData);
        lastSavedDataRef.current = currentData;
      }, 500);
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
    date,
  ]);

  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      <View style={styles.titleContainer}>
        <Text variant="titleLarge">
          {new Intl.DateTimeFormat("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          }).format(new Date(date + "T00:00:00"))}
        </Text>
      </View>
      <View>
        <List.Section>
          <FlowAccordion
            state={state}
            setExpandedAccordion={setExpandedAccordion}
            flow_intensity={flow_intensity}
            setFlow={setFlow}
            is_cycle_start={is_cycle_start}
            setCycleStart={setCycleStart}
            is_cycle_end={is_cycle_end}
            setCycleEnd={setCycleEnd}
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
    justifyContent: "center",
    padding: 10,
    paddingBottom: 0,
  },
});
