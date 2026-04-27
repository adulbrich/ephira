import { useState } from "react";
import { View } from "react-native";
import {
  List,
  Text,
  Button,
  TextInput,
  IconButton,
  Chip,
  Divider,
  useTheme,
} from "react-native-paper";
import {
  insertPregnancyAppointment,
  deletePregnancyAppointment,
  getPregnancyAppointmentsForDate,
} from "@/db/database";
import type { PregnancyAppointment } from "@/db/schema";

const APPOINTMENT_TYPES = ["OB Visit", "Ultrasound", "Lab Work", "Other"];

export default function AppointmentsAccordion({
  state,
  setExpandedAccordion,
  date,
  appointments,
  setAppointments,
}: {
  state: string | null;
  setExpandedAccordion: (accordion: string | null) => void;
  date: string;
  appointments: PregnancyAppointment[];
  setAppointments: (appointments: PregnancyAppointment[]) => void;
}) {
  const theme = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const refreshAppointments = async () => {
    const updated = await getPregnancyAppointmentsForDate(date);
    setAppointments(updated);
  };

  const handleAdd = async () => {
    if (!title.trim()) return;
    await insertPregnancyAppointment(
      date,
      title.trim(),
      selectedType ?? undefined,
      notes.trim() || undefined,
    );
    setTitle("");
    setSelectedType(null);
    setNotes("");
    setShowForm(false);
    await refreshAppointments();
  };

  const handleDelete = async (id: number) => {
    await deletePregnancyAppointment(id);
    await refreshAppointments();
  };

  return (
    <List.Accordion
      title={
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ width: 120, fontSize: 16 }}>Appointments</Text>
          <Text style={{ fontSize: 16 }}>
            |{"      "}
            {appointments.length > 0 ? `${appointments.length} logged` : "None"}
          </Text>
        </View>
      }
      expanded={state === "appointments"}
      onPress={() =>
        setExpandedAccordion(state === "appointments" ? null : "appointments")
      }
      left={(props) => <List.Icon {...props} icon="calendar-clock" />}
    >
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        {appointments.map((appt) => (
          <View key={appt.id}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 8,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "500" }}>
                  {appt.title}
                </Text>
                {appt.type && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.colors.onSurfaceVariant,
                    }}
                  >
                    {appt.type}
                  </Text>
                )}
                {appt.notes && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.colors.onSurfaceVariant,
                      marginTop: 2,
                    }}
                  >
                    {appt.notes}
                  </Text>
                )}
              </View>
              <IconButton
                icon="trash-can-outline"
                size={20}
                iconColor={theme.colors.error}
                onPress={() => handleDelete(appt.id)}
              />
            </View>
            <Divider />
          </View>
        ))}

        {showForm ? (
          <View style={{ paddingTop: 12, gap: 10 }}>
            <TextInput
              label="Appointment title"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              dense
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {APPOINTMENT_TYPES.map((type) => (
                <Chip
                  key={type}
                  selected={selectedType === type}
                  onPress={() =>
                    setSelectedType(selectedType === type ? null : type)
                  }
                  compact
                >
                  {type}
                </Chip>
              ))}
            </View>
            <TextInput
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              dense
              multiline
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button
                mode="contained"
                onPress={handleAdd}
                disabled={!title.trim()}
                style={{ flex: 1 }}
              >
                Save
              </Button>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowForm(false);
                  setTitle("");
                  setSelectedType(null);
                  setNotes("");
                }}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
            </View>
          </View>
        ) : (
          <Button
            mode="contained-tonal"
            icon="plus"
            onPress={() => setShowForm(true)}
            style={{ marginTop: 8 }}
          >
            Add Appointment
          </Button>
        )}
      </View>
    </List.Accordion>
  );
}
