import { useEffect, useState } from "react";
import { View, Modal, Platform } from "react-native";
import { List, Text, Button, TextInput } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getAllVisibleMedications } from "@/db/database";
import SingleChipSelection from "./SingleChipSelection";
import { useTheme } from "react-native-paper";
import {
  useBirthControlNotes,
  useTimeTaken,
  useTimePickerState,
  useTempSelectedTime,
} from "@/assets/src/calendar-storage";

export default function BirthControlAccordion({
  state,
  setExpandedAccordion,
  selectedBirthControl,
  setSelectedBirthControl,
}: {
  state: string | null;
  setExpandedAccordion: (accordion: string | null) => void;
  selectedBirthControl: string | null;
  setSelectedBirthControl: (birthControl: string | null) => void;
}) {
  const theme = useTheme();
  const [birthControlOptions, setBirthControlOptions] = useState<string[]>([]);

  const { showTimePicker, setShowTimePicker } = useTimePickerState();
  const { tempSelectedTime, setTempSelectedTime } = useTempSelectedTime();
  const { timeTaken, setTimeTaken } = useTimeTaken();
  const { birthControlNotes, setBirthControlNotes } = useBirthControlNotes();

  useEffect(() => {
    const fetchMedications = async () => {
      const medications = await getAllVisibleMedications();
      setBirthControlOptions(
        medications
          .filter((medication) => medication.type === "birth control")
          .map((medication) => medication.name),
      );
    };
    fetchMedications();
  }, [state]);

  useEffect(() => {
    if (selectedBirthControl !== "Pill") {
      setTimeTaken("");
      setShowTimePicker(false);
    }
  }, [selectedBirthControl, setTimeTaken, setShowTimePicker]);

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      if (event.type === "set" && selectedTime) {
        setTempSelectedTime(selectedTime);
        finalizeTimeSelection(selectedTime);
      } else if (event.type === "dismissed") {
        cancelTimeSelection();
      }
    } else if (Platform.OS === "ios" && selectedTime) {
      setTempSelectedTime(selectedTime);
    }
  };

  const finalizeTimeSelection = (selectedTime?: Date) => {
    const finalTime = selectedTime || tempSelectedTime || new Date();
    const hours = finalTime.getHours();
    const minutes = finalTime.getMinutes();
    const isPM = hours >= 12;
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, "0");
    const period = isPM ? "PM" : "AM";

    setTimeTaken(`${formattedHours}:${formattedMinutes} ${period}`);
    setTempSelectedTime(null);
    setShowTimePicker(false);
  };

  const cancelTimeSelection = () => {
    setTempSelectedTime(null);
    setShowTimePicker(false);
  };

  const birthControlNotesInput = (
    <View>
      <Text style={{ marginVertical: 8 }}>Notes</Text>
      <TextInput
        placeholder="Enter reminders, appointments, etc."
        value={birthControlNotes}
        onChangeText={setBirthControlNotes}
        style={{ width: "90%" }}
      />
    </View>
  );

  const renderPillUI = (
    <View>
      <Button
        mode="elevated"
        onPress={() => setShowTimePicker(true)}
        textColor={theme.colors.onSecondary}
        buttonColor={theme.colors.secondary}
        style={{ flex: 1, width: "90%" }}
      >
        {timeTaken !== "" ? `Time Taken: ${timeTaken}` : "Select Time Taken"}
      </Button>
      <Modal
        visible={showTimePicker}
        animationType="fade"
        transparent={true}
        onRequestClose={cancelTimeSelection}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          {Platform.OS === "ios" ? (
            <View
              style={{
                backgroundColor: theme.colors.surface,
                padding: 20,
                borderRadius: 10,
                width: "80%",
                alignItems: "center",
              }}
            >
              <DateTimePicker
                value={tempSelectedTime || new Date()}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={handleTimeChange}
                style={{ width: "100%", paddingHorizontal: 10 }}
              />
              <View
                style={{
                  flexDirection: "row",
                  marginTop: 8,
                  width: "100%",
                }}
              >
                <Button
                  mode="elevated"
                  onPress={cancelTimeSelection}
                  textColor={theme.colors.onSecondary}
                  buttonColor={theme.colors.secondary}
                  style={{ flex: 1, marginHorizontal: 5 }}
                >
                  Cancel
                </Button>
                <Button
                  mode="elevated"
                  onPress={() =>
                    finalizeTimeSelection(tempSelectedTime || undefined)
                  }
                  textColor={theme.colors.onSecondary}
                  buttonColor={theme.colors.secondary}
                  style={{ flex: 1, marginHorizontal: 5 }}
                >
                  Done
                </Button>
              </View>
            </View>
          ) : (
            <DateTimePicker
              value={tempSelectedTime || new Date()}
              mode="time"
              is24Hour={false}
              display="spinner"
              onChange={(event, selectedTime) => {
                handleTimeChange(event, selectedTime);
                setShowTimePicker(false);
              }}
            />
          )}
        </View>
      </Modal>
      {birthControlNotesInput}
    </View>
  );

  const renderNotesUI = <View>{birthControlNotesInput}</View>;

  const renderBirthControlUI = () => {
    switch (selectedBirthControl) {
      case "Pill":
        return renderPillUI;
      case "IUD":
      case "Ring":
      case "Patch":
      case "Shot":
      case "Implant":
        return renderNotesUI;
      default:
        return (
          <Text style={{ marginVertical: 8 }}>
            Select a birth control option to see details.
          </Text>
        );
    }
  };

  const selectedBirthControlLabel = birthControlOptions.includes(
    selectedBirthControl as string,
  )
    ? selectedBirthControl
    : "None";

  return (
    <List.Accordion
      title={"Birth Control   |   " + selectedBirthControlLabel}
      expanded={state === "birthControl"}
      onPress={() =>
        setExpandedAccordion(state === "birthControl" ? null : "birthControl")
      }
      left={(props) => <List.Icon {...props} icon="shield-check" />}
    >
      <SingleChipSelection
        options={birthControlOptions}
        selectedValue={selectedBirthControl}
        setSelectedValue={setSelectedBirthControl}
        label="Select Birth Control:"
      />
      {renderBirthControlUI()}
    </List.Accordion>
  );
}
