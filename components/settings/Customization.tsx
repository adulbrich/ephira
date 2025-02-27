import { useState, useEffect } from "react";
import {
  getAllSymptoms,
  getAllMoods,
  getAllMedications,
  updateSymptom,
  updateMood,
  updateMedication,
  updateSetting,
} from "@/db/database";
import { SettingsKeys } from "@/constants/Settings";
import { ThemedView } from "@/components/ThemedView";
import {
  Text,
  List,
  Divider,
  useTheme,
  Modal,
  Portal,
  IconButton,
  Switch,
  MD3Theme,
} from "react-native-paper";
import { ScrollView, StyleSheet, Dimensions } from "react-native";
import {
  useAccordion,
  useCalendarFilters,
  useDatabaseChangeNotifier,
} from "@/assets/src/calendar-storage";

export interface Symptom {
  id: number;
  name: string;
  visible?: boolean;
  description?: string;
}

export interface Mood {
  id: number;
  name: string;
  visible?: boolean;
  description?: string;
}

export interface Medication {
  id: number;
  name: string;
  dose?: string;
  visible?: boolean;
  type?: string;
  description?: string;
}

function AccordionContents({
  items,
  itemType,
  onToggleSwitch,
}: {
  items: Symptom[] | Mood[] | Medication[];
  itemType: string;
  onToggleSwitch: (
    entryType: string,
    entry: Symptom | Mood | Medication,
  ) => void;
}) {
  const theme = useTheme();
  const { width, height } = Dimensions.get("window");
  const styles = makeStyles(theme, width, height);

  return (
    <ScrollView style={styles.scrollview}>
      {items.map((item) => (
        <List.Item
          key={item.id}
          title={item.name}
          right={() => (
            <Switch
              value={item.visible === true}
              onValueChange={() => {
                onToggleSwitch(itemType, item);
              }}
            />
          )}
        />
      ))}
    </ScrollView>
  );
}

function CalendarEntriesModal({ onDismiss }: { onDismiss: () => void }) {
  const theme = useTheme();
  const { width, height } = Dimensions.get("window");
  const styles = makeStyles(theme, width, height);
  const setDbChange = useDatabaseChangeNotifier().setDatabaseChange;
  const { selectedFilters, setSelectedFilters } = useCalendarFilters();
  const setAccordionState = useAccordion().setExpandedAccordion;
  const [expanded, setExpanded] = useState<string>("1");
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [birthControl, setBirthControl] = useState<Medication[]>([]);

  useEffect(() => {
    const fetchSymptoms = async () => {
      const symptoms = await getAllSymptoms();
      setSymptoms(symptoms as Symptom[]);
    };
    const fetchMoods = async () => {
      const moods = await getAllMoods();
      setMoods(moods as Mood[]);
    };
    const fetchMedications = async () => {
      const medications = await getAllMedications();
      setMedications(
        medications.filter(
          (medication) => medication.type !== "birth control",
        ) as Medication[],
      );
      setBirthControl(
        medications.filter(
          (medication) => medication.type === "birth control",
        ) as Medication[],
      );
    };

    fetchSymptoms();
    fetchMoods();
    fetchMedications();
  }, []);

  const onToggleSwitch = (
    entryType: string,
    entry: Symptom | Mood | Medication,
  ) => {
    switch (entryType) {
      case "symptom":
        updateSymptom(entry.name, !entry.visible);
        setSymptoms(
          symptoms.map((symptom) =>
            symptom.id === entry.id
              ? { ...symptom, visible: !symptom.visible }
              : symptom,
          ),
        );
        break;
      case "mood":
        updateMood(entry.name, !entry.visible);
        setMoods(
          moods.map((mood) =>
            mood.id === entry.id ? { ...mood, visible: !mood.visible } : mood,
          ),
        );
        break;
      case "medication":
        if ("type" in entry) {
          updateMedication(entry.name, !entry.visible, entry.type);
          setMedications(
            medications.map((medication) =>
              medication.id === entry.id
                ? { ...medication, visible: !medication.visible }
                : medication,
            ),
          );
        }
        break;
      case "birth control":
        if ("type" in entry) {
          updateMedication(entry.name, !entry.visible, entry.type);
          setBirthControl(
            birthControl.map((medication) =>
              medication.id === entry.id
                ? { ...medication, visible: !medication.visible }
                : medication,
            ),
          );
        }
        break;
    }

    // check if entry is in calendar filters and remove if needed
    if (selectedFilters.includes(entry.name) && entry.visible) {
      const updatedFilters = selectedFilters.filter(
        (filter: string) => filter !== entry.name,
      );
      setSelectedFilters(updatedFilters);
      updateSetting(
        SettingsKeys.calendarFilters,
        JSON.stringify(selectedFilters),
      );
    }
  };

  const onDismissModal = () => {
    // this closes any open accordions on the calendar page,
    // which will force them to re-render with the updated data
    setAccordionState(null);
    // force useLiveQuery to update
    setDbChange(Math.random().toString());
    onDismiss();
  };

  return (
    <Portal>
      <Modal visible={true} onDismiss={() => {}} style={styles.modal}>
        <ThemedView style={styles.modalContentContainer}>
          <ThemedView style={styles.modalTitleContainer}>
            <IconButton icon="arrow-left" onPress={onDismissModal} />
            <Text variant="titleLarge" style={styles.modalTitle}>
              Calendar Entries
            </Text>
          </ThemedView>
          <List.AccordionGroup
            expandedId={expanded}
            onAccordionPress={(expandedId) => setExpanded(String(expandedId))}
          >
            <List.Accordion
              title="Symptom Entries"
              id="1"
              titleStyle={styles.listTitle}
            >
              <AccordionContents
                items={symptoms}
                itemType="symptom"
                onToggleSwitch={onToggleSwitch}
              />
            </List.Accordion>
            <Divider />
            <List.Accordion
              title="Mood Entries"
              id="2"
              titleStyle={styles.listTitle}
            >
              <AccordionContents
                items={moods}
                itemType="mood"
                onToggleSwitch={onToggleSwitch}
              />
            </List.Accordion>
            <Divider />
            <List.Accordion
              title="Medication Entries"
              id="3"
              titleStyle={styles.listTitle}
            >
              <AccordionContents
                items={medications}
                itemType="medication"
                onToggleSwitch={onToggleSwitch}
              />
            </List.Accordion>
            <Divider />
            <List.Accordion
              title="Birth Control Entries"
              id="4"
              titleStyle={styles.listTitle}
            >
              <AccordionContents
                items={birthControl}
                itemType="birth control"
                onToggleSwitch={onToggleSwitch}
              />
            </List.Accordion>
            <Divider />
          </List.AccordionGroup>
        </ThemedView>
      </Modal>
    </Portal>
  );
}

export default function Customization() {
  const [calendarEntriesModalVisible, setCalendarEntriesModalVisible] =
    useState(false);

  return (
    <ThemedView>
      <List.Section>
        <List.Accordion
          title="Customization"
          titleStyle={{
            fontSize: 20,
          }}
        >
          <List.Item
            title="Calendar Entries"
            description="Choose what's visible on the calendar"
            onPress={() => setCalendarEntriesModalVisible(true)}
            right={(props) => <List.Icon {...props} icon="arrow-right" />}
          />
        </List.Accordion>
      </List.Section>
      <Divider />
      {calendarEntriesModalVisible && (
        <CalendarEntriesModal
          onDismiss={() => setCalendarEntriesModalVisible(false)}
        />
      )}
    </ThemedView>
  );
}

const makeStyles = (theme: MD3Theme, width: number, height: number) => {
  return StyleSheet.create({
    modal: {
      justifyContent: "flex-start",
      height: "100%",
    },
    modalTitleContainer: {
      backgroundColor: theme.colors.primaryContainer,
      padding: 5,
      alignItems: "center",
      flexDirection: "row",
    },
    modalTitle: {
      textAlign: "center",
      fontWeight: "bold",
      color: theme.colors.onPrimaryContainer,
    },
    modalContentContainer: {
      height: "100%",
    },
    listTitle: {
      fontSize: 20,
    },
    scrollview: {
      maxHeight: height * 0.5,
      boxShadow: "inset 0 7px 9px -7px rgba(0,0,0,0.2)",
    },
  });
};
