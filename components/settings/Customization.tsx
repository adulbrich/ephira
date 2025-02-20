import { useState, useEffect } from "react";
import { getAllSymptoms, getAllMoods, getAllMedications } from "@/db/database";
import { Symptom } from "@/constants/Interfaces";
import { ThemedView } from "@/components/ThemedView";
import {
  Text,
  List,
  Divider,
  useTheme,
  Modal,
  Portal,
  IconButton,
} from "react-native-paper";

function CalendarEntriesModal({ onDismiss }: { onDismiss: () => void }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState<string>("1");
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [moods, setMoods] = useState([]);
  const [medications, setMedications] = useState([]);

  useEffect(() => {
    const fetchSymptoms = async () => {
      const symptoms = await getAllSymptoms();
      setSymptoms(symptoms);
    };
    const fetchMoods = async () => {
      const moods = await getAllMoods();
      setMoods(moods);
    };
    const fetchMedications = async () => {
      const medications = await getAllMedications();
      setMedications(medications);
    };

    fetchSymptoms();
    fetchMoods();
    fetchMedications();
  }, []);

  return (
    <Portal>
      <Modal
        visible={true}
        onDismiss={onDismiss}
        style={{
          justifyContent: "flex-start",
          height: "100%",
          backgroundColor: theme.colors.surface,
        }}
      >
        <ThemedView
          style={{
            backgroundColor: theme.colors.primaryContainer,
            padding: 5,
            alignItems: "center",
            flexDirection: "row",
          }}
        >
          <IconButton icon="arrow-left" onPress={onDismiss} />
          <Text
            variant="titleLarge"
            style={{
              textAlign: "center",
              fontWeight: "bold",
              color: theme.colors.onPrimaryContainer,
            }}
          >
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
            titleStyle={{
              fontSize: 20,
            }}
          >
            <List.Item title="Headache" />
            <List.Item title="Nausea" />
            <List.Item title="Fatigue" />
          </List.Accordion>
          <List.Accordion
            title="Mood Entries"
            id="2"
            titleStyle={{
              fontSize: 20,
            }}
          >
            <List.Item title="Happy" />
            <List.Item title="Sad" />
            <List.Item title="Angry" />
          </List.Accordion>
          <List.Accordion
            title="Medication Entries"
            id="3"
            titleStyle={{
              fontSize: 20,
            }}
          >
            <List.Item title="Ibuprofen" />
            <List.Item title="Paracetamol" />
            <List.Item title="Aspirin" />
          </List.Accordion>
        </List.AccordionGroup>
      </Modal>
    </Portal>
  );
}

export default function Customization() {
  const theme = useTheme();
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
