import { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { List, Text, Divider, useTheme } from "react-native-paper";
import {
  upsertPregnancyDay,
  getPregnancyDay,
  getPregnancyAppointmentsForDate,
} from "@/db/database";
import {
  usePregnancySelectedDate,
  usePregnancyAccordion,
  usePregnancyAppointments,
} from "@/assets/src/pregnancy-storage";
import KicksAccordion from "./KicksAccordion";
import AppointmentsAccordion from "./AppointmentsAccordion";
import SymptomsAccordion from "@/components/dayView/SymptomsAccordion";
import MoodsAccordion from "@/components/dayView/MoodsAccordion";
import NotesAccordion from "@/components/dayView/NotesAccordion";
import Snackbar from "@/components/ui/Snackbar";

export default function PregnancyDayView() {
  const theme = useTheme();
  const { state, setExpandedAccordion } = usePregnancyAccordion();
  const {
    date,
    kicks,
    symptoms,
    moods,
    notes,
    setKicks,
    setSymptoms,
    setMoods,
    setNotes,
  } = usePregnancySelectedDate();
  const { appointments, setAppointments } = usePregnancyAppointments();

  const [saveMessageVisible, setSaveMessageVisible] = useState(false);
  const [saveMessageContent, setSaveMessageContent] = useState<string[]>([]);
  const initialLoadComplete = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  // load data for selected date
  useEffect(() => {
    const fetchAll = async () => {
      initialLoadComplete.current = false;

      const day = await getPregnancyDay(date);
      setKicks(day?.kicks ?? 0);
      setSymptoms(day?.symptoms ? JSON.parse(day.symptoms) : []);
      setMoods(day?.moods ? JSON.parse(day.moods) : []);
      setNotes(day?.notes ?? "");

      const appts = await getPregnancyAppointmentsForDate(date);
      setAppointments(appts);

      setExpandedAccordion(null);
      initialLoadComplete.current = true;
    };

    if (date) fetchAll();
  }, [
    date,
    setKicks,
    setSymptoms,
    setMoods,
    setNotes,
    setAppointments,
    setExpandedAccordion,
  ]);

  const save = useCallback(async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    try {
      await upsertPregnancyDay(date, kicks, symptoms, moods, notes);
      setSaveMessageContent(["Saved!"]);
      setSaveMessageVisible(true);
    } catch {
      setSaveMessageContent(["Save failed. Please try again."]);
      setSaveMessageVisible(true);
    } finally {
      isSavingRef.current = false;
    }
  }, [date, kicks, symptoms, moods, notes]);

  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  // debounced auto-save whenever data changes
  useEffect(() => {
    if (!date || !initialLoadComplete.current) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveRef.current();
    }, 400);
  }, [kicks, symptoms, moods, notes, date]);

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
          <AppointmentsAccordion
            state={state}
            setExpandedAccordion={setExpandedAccordion}
            date={date}
            appointments={appointments}
            setAppointments={setAppointments}
          />
          <Divider />
          <KicksAccordion
            state={state}
            setExpandedAccordion={setExpandedAccordion}
            kicks={kicks}
            setKicks={setKicks}
          />
          <Divider />
          <SymptomsAccordion
            state={state}
            setExpandedAccordion={setExpandedAccordion}
            selectedSymptoms={symptoms}
            setSelectedSymptoms={setSymptoms}
          />
          <Divider />
          <MoodsAccordion
            state={state}
            setExpandedAccordion={setExpandedAccordion}
            selectedMoods={moods}
            setSelectedMoods={setMoods}
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
