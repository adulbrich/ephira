import { useState, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
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
  useDatabaseChangeNotifier,
  useIntercourse,
} from "@/assets/src/calendar-storage";
import FlowAccordion from "@/components/dayView/FlowAccordion";
import MedicationsAccordion from "./MedicationsAccordion";
import BirthControlAccordion from "./BirthControlAccordion";
import SymptomsAccordion from "./SymptomsAccordion";
import MoodsAccordion from "./MoodsAccordion";
import NotesAccordion from "./NotesAccordion";
import IntercourseAccordion from "./IntercourseAccordion";
import Snackbar from "@/components/ui/Snackbar";
import { savedSectionLabel } from "@/components/dayView/saveMessage";
import {
  birthControlIn,
  createLoggedDaySaver,
  emptyLoggedDay,
  loadLoggedDay,
  medicationsExcludingBirthControl,
  type LoggedDay,
} from "@/db/loggedDay";

export default function DayView() {
  const theme = useTheme();
  const { state, setExpandedAccordion } = useAccordion();
  const { selectedMoods, setSelectedMoods } = useMoods();
  const {
    date,
    flow_intensity,
    notes,
    setFlow,
    setNotes,
    is_cycle_start,
    setCycleStart,
    is_cycle_end,
    setCycleEnd,
  } = useSelectedDate();
  const { selectedSymptoms, setSelectedSymptoms } = useSymptoms();
  const { selectedMedications, setSelectedMedications } = useMedications();
  const { selectedBirthControl, setSelectedBirthControl } = useBirthControl();
  const { birthControlNotes, setBirthControlNotes } = useBirthControlNotes();
  const { timeTaken, setTimeTaken } = useTimeTaken();
  const { databaseChange } = useDatabaseChangeNotifier();
  const { intercourse, setIntercourse } = useIntercourse();

  const [saveMessageVisible, setSaveMessageVisible] = useState(false);
  const [saveMessageContent, setSaveMessageContent] = useState<string[]>([]);

  // Everything about when and how a day is written lives in db/loggedDay.ts.
  // What is left here is turning store state into a snapshot and back.
  const saver = useRef(createLoggedDaySaver()).current;
  const [lastSaved, setLastSaved] = useState<LoggedDay | null>(null);
  const loaded = useRef(false);

  const snapshot: LoggedDay = useMemo(() => {
    const birthControl = selectedBirthControl
      ? [
          {
            name: selectedBirthControl,
            timeTaken: timeTaken,
            notes: birthControlNotes,
          },
        ]
      : [];

    return {
      date,
      flow: flow_intensity ?? 0,
      notes: notes ?? "",
      isCycleStart: is_cycle_start ?? false,
      isCycleEnd: is_cycle_end ?? false,
      intercourse: intercourse ?? false,
      symptoms: selectedSymptoms,
      moods: selectedMoods,
      medications: [
        ...selectedMedications.map((name) => ({ name })),
        ...birthControl,
      ],
    };
  }, [
    date,
    flow_intensity,
    notes,
    is_cycle_start,
    is_cycle_end,
    intercourse,
    selectedSymptoms,
    selectedMoods,
    selectedMedications,
    selectedBirthControl,
    birthControlNotes,
    timeTaken,
  ]);

  // Open a day: one load, and the saver's baseline comes from what was read.
  useEffect(() => {
    let stale = false;
    loaded.current = false;

    loadLoggedDay(date).then((day) => {
      if (stale) return;

      setFlow(day.flow);
      setNotes(day.notes);
      setCycleStart(day.isCycleStart);
      setCycleEnd(day.isCycleEnd);
      setIntercourse(day.intercourse);
      setSelectedSymptoms(day.symptoms);
      setSelectedMoods(day.moods);
      setSelectedMedications(medicationsExcludingBirthControl(day));

      const birthControl = birthControlIn(day);
      setSelectedBirthControl(birthControl?.name ?? null);
      setBirthControlNotes(birthControl?.notes ?? "");
      setTimeTaken(birthControl?.timeTaken ?? "");

      saver.reset(day);
      setLastSaved(day);
      loaded.current = true;
    });

    setExpandedAccordion(null);

    return () => {
      stale = true;
      saver.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, databaseChange]);

  // Auto-save. The debounce, the in-flight guard and the two same-date guards
  // are the saver's, not this component's.
  useEffect(() => {
    if (!date || !loaded.current) return;

    const previous = lastSaved ?? emptyLoggedDay(date);

    saver.schedule(snapshot).then((outcome) => {
      if (outcome.status === "saved") {
        setLastSaved(outcome.day);
        const section = savedSectionLabel(state, outcome.day, previous);
        if (section) {
          setSaveMessageContent([`${section} Saved!`]);
          setSaveMessageVisible(true);
        }
      } else if (outcome.status === "failed") {
        setSaveMessageContent(["Save failed. Please try again."]);
        setSaveMessageVisible(true);
      }
    });
    // `state` and `lastSaved` are read when the save lands, not what triggers
    // one; including them would schedule a save on every accordion tap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, date]);

  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      <View style={styles.titleContainer}>
        <Text variant="titleLarge" style={styles.titleText}>
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
          <BirthControlAccordion
            state={state}
            setExpandedAccordion={setExpandedAccordion}
            selectedBirthControl={selectedBirthControl}
            setSelectedBirthControl={setSelectedBirthControl}
          />
          <Divider />
          <IntercourseAccordion
            state={state}
            setExpandedAccordion={setExpandedAccordion}
            intercourse={intercourse}
            setIntercourse={setIntercourse}
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
    paddingHorizontal: 12,
    flexWrap: "wrap",
  },
  titleText: {
    textAlign: "center",
    flexShrink: 1,
  },
});
