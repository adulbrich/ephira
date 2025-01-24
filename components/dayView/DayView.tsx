import { useEffect, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { insertDay, getDay } from "@/db/database";
import { List, Button, Text, useTheme, Divider } from "react-native-paper";
import {
  useAccordion,
  useMoods,
  useSelectedDate,
  useSymptoms,
} from "@/assets/src/calendar-storage";
import FlowAccordion from "@/components/dayView/FlowAccordion";
import MedicationsAccordion from "./MedicationsAccordion";
import SymptomsAccordion from "./SymptomsAccordion";
import MoodsAccordion from "./MoodsAccordion";
import NotesAccordion from "./NotesAccordion";
import { useSyncEntries } from "@/hooks/useSyncEntries";
import { useFetchEntries } from "@/hooks/useFetchEntries";

export default function DayView() {
  const theme = useTheme();
  const { state, setExpandedAccordion } = useAccordion();
  const { selectedMoods, setSelectedMoods } = useMoods();
  const { date, flow_intensity, notes, setFlow, setNotes } = useSelectedDate();
  const { selectedSymptoms, setSelectedSymptoms } = useSymptoms();
  const { syncEntries } = useSyncEntries(date);
  const { fetchEntries } = useFetchEntries(
    date,
    setSelectedSymptoms,
    setSelectedMoods
  );

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
      await fetchEntries("symptom");
      await fetchEntries("mood");
      await fetchNotes();
    });
  }

  useEffect(() => {
    setFlow(flow_intensity);
    fetchEntries("symptom");
    fetchEntries("mood");
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
