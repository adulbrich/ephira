import { Platform, StyleSheet, View } from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  Button,
  Dialog,
  IconButton,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";
import {
  MAX_DAY_IN_WEEK_INPUT,
  MAX_PREGNANCY_WEEK_INPUT,
} from "@/constants/Pregnancy";
import { formatAsISODate } from "@/utils/dates";
import type {
  DateFieldKey,
  NotSurePath,
  SetupMethod,
} from "@/components/pregnancy/pregnancySetupTypes";

type PregnancySetupDialogProps = {
  visible: boolean;
  dismissable: boolean;
  onDismiss: () => void;
  startDateIso: string | null;
  setupMethod: SetupMethod | null;
  setSetupMethod: (method: SetupMethod | null) => void;
  notSurePath: NotSurePath | null;
  setNotSurePath: (path: NotSurePath | null) => void;
  setWeeksInput: (value: string) => void;
  setDaysInput: (value: string) => void;
  parsedWeekValue: number;
  parsedDayValue: number;
  dueDateInput: Date;
  lastPeriodInput: Date;
  conceptionDateInput: Date;
  positiveTestDateInput: Date;
  activeDateField: DateFieldKey | null;
  showDatePicker: boolean;
  setShowDatePicker: (visible: boolean) => void;
  dueDateMin: Date;
  dueDateMax: Date;
  today: Date;
  saving: boolean;
  setupError: string | null;
  onSave: () => void;
  openDatePicker: (field?: DateFieldKey) => void;
  onDateChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
};

export default function PregnancySetupDialog({
  visible,
  dismissable,
  onDismiss,
  startDateIso,
  setupMethod,
  setSetupMethod,
  notSurePath,
  setNotSurePath,
  setWeeksInput,
  setDaysInput,
  parsedWeekValue,
  parsedDayValue,
  dueDateInput,
  lastPeriodInput,
  conceptionDateInput,
  positiveTestDateInput,
  activeDateField,
  showDatePicker,
  setShowDatePicker,
  dueDateMin,
  dueDateMax,
  today,
  saving,
  setupError,
  onSave,
  openDatePicker,
  onDateChange,
}: PregnancySetupDialogProps) {
  const theme = useTheme();

  const pickerValue =
    activeDateField === "dueDate"
      ? dueDateInput
      : activeDateField === "lastPeriod"
        ? lastPeriodInput
        : activeDateField === "conceptionDate"
          ? conceptionDateInput
          : positiveTestDateInput;

  return (
    <>
      <Portal>
        <Dialog
          visible={visible}
          dismissable={dismissable}
          onDismiss={onDismiss}
        >
          <Dialog.Title style={{ textAlign: "center" }}>
            Set up Pregnancy Progress
          </Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <Text variant="titleMedium">How would you like to begin?</Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Every pregnancy is unique. We'll help track yours beautifully.
            </Text>

            <View style={styles.methodCards}>
              <Button
                mode={
                  setupMethod === "dueDate" ? "contained-tonal" : "outlined"
                }
                onPress={() => {
                  setSetupMethod("dueDate");
                  setNotSurePath(null);
                }}
              >
                I know my due date
              </Button>

              <Button
                mode={
                  setupMethod === "weeksPregnant"
                    ? "contained-tonal"
                    : "outlined"
                }
                onPress={() => {
                  setSetupMethod("weeksPregnant");
                  setNotSurePath(null);
                }}
              >
                I know how far along I am
              </Button>

              <Button
                mode={
                  setupMethod === "lastPeriod" ? "contained-tonal" : "outlined"
                }
                onPress={() => {
                  setSetupMethod("lastPeriod");
                  setNotSurePath(null);
                }}
              >
                I know the first day of my last period
              </Button>

              <Button
                mode={
                  setupMethod === "notSure" ? "contained-tonal" : "outlined"
                }
                onPress={() => setSetupMethod("notSure")}
              >
                I'm not sure
              </Button>
            </View>

            {(setupMethod === "weeksPregnant" ||
              (setupMethod === "notSure" &&
                notSurePath === "ultrasoundEstimate")) && (
              <View style={styles.weekDayRow}>
                <View style={styles.weekStepper}>
                  <Text variant="labelLarge">Weeks</Text>
                  <View style={styles.stepperControls}>
                    <IconButton
                      icon="minus"
                      mode="outlined"
                      disabled={parsedWeekValue <= 0}
                      onPress={() => setWeeksInput(String(parsedWeekValue - 1))}
                    />
                    <Text variant="headlineSmall" style={styles.stepperValue}>
                      {parsedWeekValue}
                    </Text>
                    <IconButton
                      icon="plus"
                      mode="outlined"
                      disabled={parsedWeekValue >= MAX_PREGNANCY_WEEK_INPUT}
                      onPress={() => setWeeksInput(String(parsedWeekValue + 1))}
                    />
                  </View>
                </View>
                <View style={styles.weekStepper}>
                  <Text variant="labelLarge">Days</Text>
                  <View style={styles.stepperControls}>
                    <IconButton
                      icon="minus"
                      mode="outlined"
                      disabled={parsedDayValue <= 0}
                      onPress={() => setDaysInput(String(parsedDayValue - 1))}
                    />
                    <Text variant="headlineSmall" style={styles.stepperValue}>
                      {parsedDayValue}
                    </Text>
                    <IconButton
                      icon="plus"
                      mode="outlined"
                      disabled={parsedDayValue >= MAX_DAY_IN_WEEK_INPUT}
                      onPress={() => setDaysInput(String(parsedDayValue + 1))}
                    />
                  </View>
                </View>
              </View>
            )}

            {(setupMethod === "dueDate" ||
              (setupMethod === "notSure" &&
                notSurePath === "doctorDueDate")) && (
              <Button
                mode="outlined"
                icon="calendar"
                onPress={() => openDatePicker("dueDate")}
              >
                Due Date: {formatAsISODate(dueDateInput)}
              </Button>
            )}

            {(setupMethod === "lastPeriod" ||
              (setupMethod === "notSure" && notSurePath === "lastPeriod")) && (
              <Button
                mode="outlined"
                icon="calendar"
                onPress={() => openDatePicker("lastPeriod")}
              >
                Last Period Date: {formatAsISODate(lastPeriodInput)}
              </Button>
            )}

            {setupMethod === "notSure" && (
              <View style={styles.notSureGroup}>
                <Text variant="bodyMedium">
                  No worries. Do you know any of these?
                </Text>
                <Button
                  mode={
                    notSurePath === "doctorDueDate"
                      ? "contained-tonal"
                      : "outlined"
                  }
                  onPress={() => setNotSurePath("doctorDueDate")}
                >
                  Doctor due date
                </Button>
                <Button
                  mode={
                    notSurePath === "ultrasoundEstimate"
                      ? "contained-tonal"
                      : "outlined"
                  }
                  onPress={() => setNotSurePath("ultrasoundEstimate")}
                >
                  Ultrasound estimate
                </Button>
                <Button
                  mode={
                    notSurePath === "lastPeriod"
                      ? "contained-tonal"
                      : "outlined"
                  }
                  onPress={() => setNotSurePath("lastPeriod")}
                >
                  First day of last period
                </Button>
                <Button
                  mode={
                    notSurePath === "conceptionDate"
                      ? "contained-tonal"
                      : "outlined"
                  }
                  onPress={() => setNotSurePath("conceptionDate")}
                >
                  Approximate conception date
                </Button>
              </View>
            )}

            {setupMethod === "notSure" && notSurePath === "conceptionDate" && (
              <Button
                mode="outlined"
                icon="calendar"
                onPress={() => openDatePicker("conceptionDate")}
              >
                Conception Date: {formatAsISODate(conceptionDateInput)}
              </Button>
            )}

            {Platform.OS === "ios" && showDatePicker && activeDateField ? (
              <View style={styles.iosPickerContainer}>
                <DateTimePicker
                  value={pickerValue}
                  mode="date"
                  display="spinner"
                  minimumDate={
                    activeDateField === "dueDate" ? dueDateMin : undefined
                  }
                  maximumDate={
                    activeDateField === "dueDate" ? dueDateMax : today
                  }
                  onChange={onDateChange}
                />
                <Button onPress={() => setShowDatePicker(false)}>Done</Button>
              </View>
            ) : null}

            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Your pregnancy timeline can always be updated later.
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Your pregnancy data stays private and on-device.
            </Text>

            {setupError ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
                {setupError}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            {startDateIso ? <Button onPress={onDismiss}>Cancel</Button> : null}
            <Button loading={saving} mode="contained" onPress={onSave}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {Platform.OS !== "ios" && showDatePicker && activeDateField ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="default"
          minimumDate={activeDateField === "dueDate" ? dueDateMin : undefined}
          maximumDate={activeDateField === "dueDate" ? dueDateMax : today}
          onChange={onDateChange}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  weekStepper: {
    gap: 4,
    flex: 1,
  },
  weekDayRow: {
    flexDirection: "row",
    gap: 8,
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    minWidth: 56,
    textAlign: "center",
    fontWeight: "700",
  },
  iosPickerContainer: {
    borderRadius: 10,
    overflow: "hidden",
  },
  methodCards: {
    gap: 2,
  },
  notSureGroup: {
    gap: 6,
    marginTop: 2,
  },
});
