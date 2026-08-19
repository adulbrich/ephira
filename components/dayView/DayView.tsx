import { useCallback, useState, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { List, Text, useTheme, Divider } from "react-native-paper";
import {
  useSelectedDate,
  useDatabaseChangeNotifier,
} from "@/stores/calendar-storage";
import { Section } from "@/constants/Sections";
import { useCatalogue } from "@/hooks/useCatalogue";
import FlowAccordion from "@/components/dayView/FlowAccordion";
import BirthControlAccordion from "./BirthControlAccordion";
import CatalogueAccordion from "./CatalogueAccordion";
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
  type LoggedMedication,
} from "@/db/loggedDay";

export default function DayView() {
  const theme = useTheme();
  // Which Section is expanded is this screen's business. It used to be a
  // store, which doubled as the Catalogue's cache-invalidation signal.
  const [state, setExpandedAccordion] = useState<Section | null>(null);
  const catalogue = useCatalogue();
  const { date } = useSelectedDate();
  const { databaseChange } = useDatabaseChangeNotifier();

  // The selected day's contents are this screen's, not the app's. They were
  // global only so accordions and fetch hooks could talk past each other,
  // which db/loggedDay.ts absorbed.
  const [day, setDay] = useState<LoggedDay>(() => emptyLoggedDay(date));

  const edit = useCallback(
    (change: Partial<LoggedDay>) =>
      setDay((current) => ({ ...current, ...change })),
    [],
  );

  /** Medications and birth control share one list, so both writers rebuild it. */
  const setMedications = useCallback(
    (names: string[]) =>
      setDay((current) => {
        const birthControl = birthControlIn(current);
        return {
          ...current,
          medications: [
            ...names.map((name) => ({ name })),
            ...(birthControl ? [birthControl] : []),
          ],
        };
      }),
    [],
  );

  const setBirthControl = useCallback(
    (birthControl: LoggedMedication | null) =>
      setDay((current) => ({
        ...current,
        medications: [
          ...medicationsExcludingBirthControl(current).map((name) => ({
            name,
          })),
          ...(birthControl ? [birthControl] : []),
        ],
      })),
    [],
  );

  const [saveMessageVisible, setSaveMessageVisible] = useState(false);
  const [saveMessageContent, setSaveMessageContent] = useState<string[]>([]);

  // Everything about when and how a day is written lives in db/loggedDay.ts.
  const saver = useRef(createLoggedDaySaver()).current;
  const [lastSaved, setLastSaved] = useState<LoggedDay | null>(null);
  const loaded = useRef(false);

  // Open a day: one load, and the saver's baseline comes from what was read.
  useEffect(() => {
    let stale = false;
    loaded.current = false;

    loadLoggedDay(date).then((loadedDay) => {
      if (stale) return;

      setDay(loadedDay);
      saver.reset(loadedDay);
      setLastSaved(loadedDay);
      loaded.current = true;
    });

    setExpandedAccordion(null);

    // Flush, not cancel. The pending edit was made against the day that is
    // closing, so it belongs to that day. Cancelling here is what dropped a
    // flow selected less than the debounce before tapping another date (#162).
    //
    // This cleanup runs before the new date's effect, so the flush starts
    // while the saver's baseline is still the old day and its wrong-day guard
    // passes. The new day's reset lands later, once its loadLoggedDay
    // resolves, and the saver declines to move a baseline onto a day it did
    // not save. Inverting that order reintroduces the bug as a wrong-day.
    return () => {
      stale = true;
      saver.flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, databaseChange]);

  // Auto-save. The debounce, the in-flight guard and the two same-date guards
  // are the saver's, not this component's.
  useEffect(() => {
    if (!date || !loaded.current) return;

    const previous = lastSaved ?? emptyLoggedDay(date);

    saver.schedule(day).then((outcome) => {
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
  }, [day, date]);

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
            flow_intensity={day.flow}
            setFlow={(flow) => edit({ flow })}
            is_cycle_start={day.isCycleStart}
            setCycleStart={(isCycleStart) => edit({ isCycleStart })}
            is_cycle_end={day.isCycleEnd}
            setCycleEnd={(isCycleEnd) => edit({ isCycleEnd })}
          />
          <Divider />
          <BirthControlAccordion
            state={state}
            setExpandedAccordion={setExpandedAccordion}
            birthControlOptions={catalogue.birthControl}
            birthControl={birthControlIn(day)}
            setBirthControl={setBirthControl}
          />
          <Divider />
          <IntercourseAccordion
            state={state}
            setExpandedAccordion={setExpandedAccordion}
            intercourse={day.intercourse}
            setIntercourse={(intercourse) => edit({ intercourse })}
          />
          <Divider />
          <CatalogueAccordion
            section={Section.Symptoms}
            state={state}
            setExpandedAccordion={setExpandedAccordion}
            options={catalogue.symptoms}
            selected={day.symptoms}
            setSelected={(symptoms) => edit({ symptoms })}
          />
          <Divider />
          <CatalogueAccordion
            section={Section.Moods}
            state={state}
            setExpandedAccordion={setExpandedAccordion}
            options={catalogue.moods}
            selected={day.moods}
            setSelected={(moods) => edit({ moods })}
          />
          <Divider />
          <CatalogueAccordion
            section={Section.Medications}
            state={state}
            setExpandedAccordion={setExpandedAccordion}
            options={catalogue.medications}
            selected={medicationsExcludingBirthControl(day)}
            setSelected={setMedications}
          />
          <Divider />
          <NotesAccordion
            state={state}
            setExpandedAccordion={setExpandedAccordion}
            notes={day.notes}
            setNotes={(notes) => edit({ notes })}
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
