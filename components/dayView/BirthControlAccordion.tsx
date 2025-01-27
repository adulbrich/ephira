import { useState, useEffect } from "react";
import { View, Modal, Platform } from "react-native";
import { List, Text, Button, TextInput } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import { birthControlOptions } from "@/constants/BirthControlTypes";
import SingleChipSelection from "./SingleChipSelection";
import { useTheme } from "react-native-paper";
import {
    useAccordion,
    useMoods,
    useSelectedDate,
    useSymptoms,
    useMedications,
    useBirthControl,
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

  // State for time picker and notes
  const { showTimePicker, setShowTimePicker } = useTimePickerState();
  const { tempSelectedTime, setTempSelectedTime } = useTempSelectedTime();
  const { timeTaken, setTimeTaken } = useTimeTaken();
  const { birthControlNotes, setBirthControlNotes } = useBirthControlNotes();

  useEffect(() => {
    if (selectedBirthControl !== "pill") {
      setTimeTaken("");
      setShowTimePicker(false);
    }
  }, [selectedBirthControl]);

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (selectedTime) {
      setTempSelectedTime(selectedTime);
    }
  };

  const finalizeTimeSelection = () => {
    const finalTime = tempSelectedTime || new Date();
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
    setTimeTaken("");
  };

  const birthControlNotesInput = (
    <View>
      <Text style={{ marginVertical: 8 }}>Notes</Text>
      <TextInput
        placeholder="Enter notes, reminders, appointments, etc."
        value={birthControlNotes}
        onChangeText={setBirthControlNotes}
        style={{
          backgroundColor: theme.colors.background,
          padding: 8,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: theme.colors.outline,
        }}
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
        style={{ marginVertical: 8 }}
      >
        {timeTaken !== "" ? `Time Taken: ${timeTaken}` : "Select Time Taken"}
      </Button>
      <Modal
        visible={showTimePicker}
        animationType="fade"
        transparent
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
              display={Platform.OS === "ios" ? "spinner" : "clock"}
              onChange={handleTimeChange}
              style={{ width: "100%", paddingHorizontal: 10 }}
            />
            <View style={{ flexDirection: "row", marginTop: 8, width: "100%" }}>
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
                onPress={finalizeTimeSelection}
                textColor={theme.colors.onSecondary}
                buttonColor={theme.colors.secondary}
                style={{ flex: 1, marginHorizontal: 5 }}
              >
                Done
              </Button>
            </View>
          </View>
        </View>
      </Modal>
      {birthControlNotesInput}
    </View>
  );

  const renderNotesUI = <View>{birthControlNotesInput}</View>;

  const renderBirthControlUI = () => {
    switch (selectedBirthControl) {
      case "pill":
        return renderPillUI;
      case "iud":
      case "ring":
      case "patch":
      case "shot":
      case "implant":
        return renderNotesUI;
      default:
        return (
          <Text style={{ marginVertical: 8 }}>
            Select a birth control option to see details.
          </Text>
        );
    }
  };

  const selectedBirthControlLabel = 
  birthControlOptions.find((option) => option.value === selectedBirthControl)
  ?.label || "None";

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
