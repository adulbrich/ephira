import { useEffect, useCallback } from "react";
import { StyleSheet, View } from "react-native";
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
} from "@/db/database";
import {
  List,
  Button,
  Text,
  useTheme,
  Divider,
  TextInput,
} from "react-native-paper";
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

export default function DayView() {
  const theme = useTheme();
  const { state, setExpandedAccordion } = useAccordion();
  const { selectedMoods, setSelectedMoods } = useMoods();
  const { date, flow_intensity, notes, setFlow, setNotes } = useSelectedDate();
  const { selectedSymptoms, setSelectedSymptoms } = useSymptoms();

  const syncEntries = async (
    selectedValues: string[],
    type: "symptom" | "mood"
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
      })
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
        })
      );
      setSelected(values.filter((value) => value !== null) as string[]);
    },
    [date] // eslint-disable-line react-hooks/exhaustive-deps
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
