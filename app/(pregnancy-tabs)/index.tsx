import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, SafeAreaView, StyleSheet, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
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
import { ThemedView } from "@/components/ThemedView";
import FadeInView from "@/components/animations/FadeInView";
import { getSetting, updateSetting } from "@/db/database";
import { SettingsKeys } from "@/constants/Settings";
import {
  PregnancyRingDarkViolet,
  PregnancyRingLilac,
} from "@/constants/Colors";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

const PREGNANCY_WEEKS = 40;
const DAYS_IN_WEEK = 7;
const FULL_TERM_DAYS = PREGNANCY_WEEKS * DAYS_IN_WEEK;

type SetupMethod =
  | "dueDate"
  | "weeksPregnant"
  | "lastPeriod"
  | "notSure";
type NotSurePath =
  | "doctorDueDate"
  | "ultrasoundEstimate"
  | "lastPeriod"
  | "conceptionDate";
type DateFieldKey =
  | "dueDate"
  | "lastPeriod"
  | "conceptionDate"
  | "positiveTestDate";

const babySizeByWeek = [
  "poppy seed",
  "sesame seed",
  "lentil",
  "blueberry",
  "raspberry",
  "green olive",
  "kumquat",
  "fig",
  "cherry",
  "strawberry",
  "lime",
  "lemon",
  "apple",
  "avocado",
  "onion",
  "sweet potato",
  "mango",
  "bell pepper",
  "heirloom tomato",
  "banana",
  "carrot",
  "spaghetti squash",
  "ear of corn",
  "grapefruit",
  "cauliflower",
  "cabbage",
  "lettuce head",
  "eggplant",
  "butternut squash",
  "coconut",
  "pineapple",
  "jicama",
  "honeydew melon",
  "cantaloupe",
  "romaine lettuce",
  "papaya",
  "winter melon",
  "small pumpkin",
  "watermelon",
  "mini watermelon",
];

const formatAsISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseISODate = (value: string): Date => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const differenceInDays = (startDate: Date, endDate: Date): number =>
  Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

const addDays = (base: Date, days: number): Date => {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDueDate = (date: Date): string =>
  date.toLocaleDateString(undefined, { month: "long", day: "numeric" });

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const hexToRgb = (hex: string) => {
  const safeHex = hex.replace("#", "");
  const bigint = Number.parseInt(safeHex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("")}`;

const interpolateHexColor = (startHex: string, endHex: string, t: number) => {
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);
  return rgbToHex(
    start.r + (end.r - start.r) * t,
    start.g + (end.g - start.g) * t,
    start.b + (end.b - start.b) * t,
  );
};

export default function PregnancyHome() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [setupVisible, setSetupVisible] = useState(false);
  const [startDateIso, setStartDateIso] = useState<string | null>(null);
  const [gestationOffsetDays, setGestationOffsetDays] = useState<number>(14);
  const [dueDateInput, setDueDateInput] = useState(new Date());
  const [lastPeriodInput, setLastPeriodInput] = useState(new Date());
  const [conceptionDateInput, setConceptionDateInput] = useState(new Date());
  const [positiveTestDateInput, setPositiveTestDateInput] = useState(new Date());
  const [setupMethod, setSetupMethod] = useState<SetupMethod | null>(null);
  const [notSurePath, setNotSurePath] = useState<NotSurePath | null>(null);
  const [activeDateField, setActiveDateField] = useState<DateFieldKey | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [weeksInput, setWeeksInput] = useState("0");
  const [daysInput, setDaysInput] = useState("0");
  const [saving, setSaving] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isContractionRunning, setIsContractionRunning] = useState(false);
  const [contractionStartAt, setContractionStartAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lastContractionMs, setLastContractionMs] = useState<number | null>(null);

  const loadPregnancySettings = useCallback(async () => {
    try {
      const [startSetting, offsetSetting] = await Promise.all([
        getSetting(SettingsKeys.pregnancyStartDate),
        getSetting(SettingsKeys.pregnancyGestationOffsetDays),
      ]);
      const todayDate = new Date();
      const normalizedToday = new Date(
        todayDate.getFullYear(),
        todayDate.getMonth(),
        todayDate.getDate(),
      );

      if (startSetting?.value) {
        setStartDateIso(startSetting.value);
        setSetupVisible(false);
      } else {
        setSetupVisible(true);
      }

      const offset = Number(offsetSetting?.value);
      if (Number.isFinite(offset) && offset >= -280 && offset <= 280) {
        setGestationOffsetDays(offset);
        if (startSetting?.value) {
          const startDate = parseISODate(startSetting.value);
          const currentPregnancyDay = Math.max(
            0,
            differenceInDays(startDate, normalizedToday) + offset,
          );
          const derivedWeek = Math.floor(currentPregnancyDay / DAYS_IN_WEEK) + 1;
          setWeeksInput(String(derivedWeek));
          setDaysInput(String(currentPregnancyDay % DAYS_IN_WEEK));
          const derivedDayZero = addDays(normalizedToday, -currentPregnancyDay);
          const derivedDue = addDays(derivedDayZero, FULL_TERM_DAYS);
          setDueDateInput(derivedDue);
          setLastPeriodInput(derivedDayZero);
          setConceptionDateInput(addDays(derivedDayZero, 14));
          setPositiveTestDateInput(addDays(derivedDayZero, 28));
        } else {
          setWeeksInput("2");
          setDaysInput("0");
          setDueDateInput(addDays(normalizedToday, 266));
          setLastPeriodInput(addDays(normalizedToday, -14));
          setConceptionDateInput(normalizedToday);
          setPositiveTestDateInput(addDays(normalizedToday, 14));
        }
      } else {
        setWeeksInput("2");
        setDaysInput("0");
        setDueDateInput(addDays(normalizedToday, 266));
        setLastPeriodInput(addDays(normalizedToday, -14));
        setConceptionDateInput(normalizedToday);
        setPositiveTestDateInput(addDays(normalizedToday, 14));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPregnancySettings();
  }, [loadPregnancySettings]);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const pregnancyDay = useMemo(() => {
    if (!startDateIso) return null;
    const startDate = parseISODate(startDateIso);
    return Math.max(0, differenceInDays(startDate, today) + gestationOffsetDays);
  }, [startDateIso, today, gestationOffsetDays]);

  const weekNumber = useMemo(() => {
    if (pregnancyDay === null) return null;
    return Math.min(PREGNANCY_WEEKS, Math.floor(pregnancyDay / DAYS_IN_WEEK) + 1);
  }, [pregnancyDay]);

  const daysInCurrentWeek = useMemo(() => {
    if (pregnancyDay === null) return 0;
    return pregnancyDay % DAYS_IN_WEEK;
  }, [pregnancyDay]);

  const babySize = useMemo(() => {
    if (!weekNumber) return "";
    const index = Math.max(0, Math.min(babySizeByWeek.length - 1, weekNumber - 1));
    return babySizeByWeek[index];
  }, [weekNumber]);

  const dueDaysRemaining = useMemo(() => {
    if (pregnancyDay === null) return null;
    return Math.max(0, PREGNANCY_WEEKS * DAYS_IN_WEEK - pregnancyDay);
  }, [pregnancyDay]);

  const dueDate = useMemo(() => {
    if (!startDateIso) return null;
    const startDate = parseISODate(startDateIso);
    const effectivePregnancyDayZero = addDays(startDate, -gestationOffsetDays);
    return addDays(effectivePregnancyDayZero, PREGNANCY_WEEKS * DAYS_IN_WEEK);
  }, [startDateIso, gestationOffsetDays]);

  const trimesterLabel = useMemo(() => {
    if (!weekNumber) return "";
    if (weekNumber <= 13) return "1st Trimester";
    if (weekNumber <= 27) return "2nd Trimester";
    return "3rd Trimester";
  }, [weekNumber]);

  const ringProgress = useMemo(() => {
    if (pregnancyDay === null) return 0;
    return Math.min(1, Math.max(0, pregnancyDay / (PREGNANCY_WEEKS * DAYS_IN_WEEK)));
  }, [pregnancyDay]);

  const ringSize = 290;
  const ringStroke = 20;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - ringProgress);
  const dueDateMin = useMemo(() => addDays(today, 1), [today]);
  const dueDateMax = useMemo(() => addDays(today, FULL_TERM_DAYS + 21), [today]);
  const ringEndColor = useMemo(
    () =>
      interpolateHexColor(
        PregnancyRingLilac,
        PregnancyRingDarkViolet,
        ringProgress,
      ),
    [ringProgress],
  );

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (event.type === "set" && selectedDate) {
      if (activeDateField === "dueDate") setDueDateInput(selectedDate);
      if (activeDateField === "lastPeriod") setLastPeriodInput(selectedDate);
      if (activeDateField === "conceptionDate")
        setConceptionDateInput(selectedDate);
      if (activeDateField === "positiveTestDate")
        setPositiveTestDateInput(selectedDate);
    }
  };

  const openDatePicker = (field?: DateFieldKey) => {
    const targetField = field ?? activeDateField;
    if (!targetField) return;
    setActiveDateField(targetField);
    const dateForField =
      targetField === "dueDate"
        ? dueDateInput
        : targetField === "lastPeriod"
          ? lastPeriodInput
          : targetField === "conceptionDate"
            ? conceptionDateInput
            : positiveTestDateInput;

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: dateForField,
        mode: "date",
        minimumDate: targetField === "dueDate" ? dueDateMin : undefined,
        maximumDate: targetField === "dueDate" ? dueDateMax : today,
        onChange: onDateChange,
      });
      return;
    }
    setShowDatePicker((prev) => !prev);
  };

  const parsedWeekValue = useMemo(() => {
    const parsed = Number.parseInt(weeksInput, 10);
    if (Number.isNaN(parsed)) return 0;
    return Math.min(42, Math.max(0, parsed));
  }, [weeksInput]);
  const parsedDayValue = useMemo(() => {
    const parsed = Number.parseInt(daysInput, 10);
    if (Number.isNaN(parsed)) return 0;
    return Math.min(6, Math.max(0, parsed));
  }, [daysInput]);

  useEffect(() => {
    if (!isContractionRunning || !contractionStartAt) return;
    const timerId = setInterval(() => {
      setElapsedMs(Date.now() - contractionStartAt);
    }, 1000);
    return () => clearInterval(timerId);
  }, [isContractionRunning, contractionStartAt]);

  const formatDuration = (durationMs: number): string => {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const handleContractionTimerPress = () => {
    if (!isContractionRunning) {
      const now = Date.now();
      setContractionStartAt(now);
      setElapsedMs(0);
      setIsContractionRunning(true);
      return;
    }

    setIsContractionRunning(false);
    setContractionStartAt(null);
    setLastContractionMs(elapsedMs);
    setElapsedMs(0);
  };

  const handleSaveSetup = async () => {
    if (!setupMethod) {
      setSetupError("Please choose how you would like to begin.");
      return;
    }

    const normalizedWeeks = weeksInput.trim() === "" ? "0" : weeksInput;
    const parsedWeeks = Number.parseInt(normalizedWeeks, 10);
    const normalizedDays = daysInput.trim() === "" ? "0" : daysInput;
    const parsedDays = Number.parseInt(normalizedDays, 10);

    setSetupError(null);
    setSaving(true);
    try {
      let targetCurrentPregnancyDay = 0;
      let anchorStartDate = today;

      const computeFromDueDate = () => {
        const daysUntilDue = differenceInDays(today, dueDateInput);
        return clamp(FULL_TERM_DAYS - daysUntilDue, 0, 42 * DAYS_IN_WEEK);
      };

      if (setupMethod === "dueDate") {
        targetCurrentPregnancyDay = computeFromDueDate();
      } else if (setupMethod === "weeksPregnant") {
        if (
          Number.isNaN(parsedWeeks) ||
          parsedWeeks < 0 ||
          parsedWeeks > 42 ||
          Number.isNaN(parsedDays) ||
          parsedDays < 0 ||
          parsedDays > 6
        ) {
          setSetupError("Please choose a valid week (0-42) and day (0-6).");
          setSaving(false);
          return;
        }
        targetCurrentPregnancyDay =
          Math.max(0, parsedWeeks - 1) * DAYS_IN_WEEK + parsedDays;
      } else if (setupMethod === "lastPeriod") {
        anchorStartDate = lastPeriodInput;
        targetCurrentPregnancyDay = Math.max(
          0,
          differenceInDays(lastPeriodInput, today),
        );
      } else {
        if (!notSurePath) {
          setSetupError("Choose one option so we can estimate your timeline.");
          setSaving(false);
          return;
        }
        if (notSurePath === "doctorDueDate") {
          targetCurrentPregnancyDay = computeFromDueDate();
        } else if (notSurePath === "ultrasoundEstimate") {
          if (
            Number.isNaN(parsedWeeks) ||
            parsedWeeks < 0 ||
            parsedWeeks > 42 ||
            Number.isNaN(parsedDays) ||
            parsedDays < 0 ||
            parsedDays > 6
          ) {
            setSetupError("Please choose a valid week (0-42) and day (0-6).");
            setSaving(false);
            return;
          }
          targetCurrentPregnancyDay =
            Math.max(0, parsedWeeks - 1) * DAYS_IN_WEEK + parsedDays;
        } else if (notSurePath === "lastPeriod") {
          anchorStartDate = lastPeriodInput;
          targetCurrentPregnancyDay = Math.max(
            0,
            differenceInDays(lastPeriodInput, today),
          );
        } else {
          targetCurrentPregnancyDay = Math.max(
            0,
            differenceInDays(conceptionDateInput, today) + 14,
          );
        }
      }

      const daysSinceStart = differenceInDays(anchorStartDate, today);
      const offsetDays = targetCurrentPregnancyDay - daysSinceStart;
      const isoDate = formatAsISODate(anchorStartDate);
      await Promise.all([
        updateSetting(SettingsKeys.pregnancyStartDate, isoDate),
        updateSetting(
          SettingsKeys.pregnancyGestationOffsetDays,
          String(offsetDays),
        ),
      ]);
      setStartDateIso(isoDate);
      setGestationOffsetDays(offsetDays);
      setSetupVisible(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FadeInView duration={200} backgroundColor={theme.colors.background}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          {loading ? (
            <View style={styles.content}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                Loading your progress...
              </Text>
            </View>
          ) : (
            <View style={styles.content}>
              <View style={styles.progressSection}>
                <View style={styles.progressContent}>
                  <View style={styles.progressRingWrapper}>
                    <Svg width={ringSize} height={ringSize}>
                      <Defs>
                        <LinearGradient
                          id="pregnancyPurpleGradient"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <Stop offset="0%" stopColor={PregnancyRingLilac} />
                          <Stop offset="55%" stopColor="#A78BFA" />
                          <Stop offset="100%" stopColor={ringEndColor} />
                        </LinearGradient>
                        <LinearGradient
                          id="bubbleInnerFill"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.24" />
                          <Stop offset="45%" stopColor={PregnancyRingLilac} stopOpacity="0.10" />
                          <Stop offset="100%" stopColor={PregnancyRingDarkViolet} stopOpacity="0.12" />
                        </LinearGradient>
                        <LinearGradient
                          id="bubbleHighlightFill"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
                          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.02" />
                        </LinearGradient>
                      </Defs>
                      <Circle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={ringRadius - ringStroke * 0.66}
                        fill="url(#bubbleInnerFill)"
                        opacity={0.85}
                      />
                      <Circle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={ringRadius - ringStroke * 0.66}
                        stroke="#FFFFFF"
                        strokeWidth={2}
                        fill="none"
                        opacity={0.16}
                      />
                      <Circle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={ringRadius - ringStroke * 0.88}
                        fill="url(#bubbleHighlightFill)"
                        opacity={0.42}
                      />
                      <Circle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={ringRadius}
                        stroke={theme.colors.outlineVariant}
                        strokeWidth={ringStroke}
                        fill="none"
                        opacity={0.45}
                      />
                      <Circle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={ringRadius + 2}
                        stroke="#FFFFFF"
                        strokeWidth={2}
                        fill="none"
                        opacity={0.14}
                      />
                      <Circle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={ringRadius - 1}
                        stroke="#FFFFFF"
                        strokeWidth={1}
                        fill="none"
                        opacity={0.08}
                      />
                      <Circle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={ringRadius}
                        stroke="url(#pregnancyPurpleGradient)"
                        strokeWidth={ringStroke}
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringOffset}
                        transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                      />
                    </Svg>
                    <View style={styles.progressRingCenter}>
                      <Text
                        variant="headlineSmall"
                        style={[styles.weeksText, { color: theme.colors.primary }]}
                      >
                        Week {weekNumber ?? 0}
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}
                      >
                        Baby is the size of a {babySize}
                      </Text>
                    </View>
                  </View>

                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                    Week {weekNumber ?? 0} • Day {daysInCurrentWeek + 1}
                  </Text>
                  <Text
                    variant="bodyLarge"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {trimesterLabel}
                  </Text>
                  <Text
                    variant="bodyLarge"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Due Date: {dueDate ? formatDueDate(dueDate) : "-"}
                  </Text>
                </View>

                <Text
                  variant="bodyMedium"
                  style={[styles.subText, { color: theme.colors.onSurfaceVariant }]}
                >
                  {dueDaysRemaining !== null
                    ? `${dueDaysRemaining} days until week ${PREGNANCY_WEEKS}.`
                    : "Set up your pregnancy details to see progress."}
                </Text>
                {lastContractionMs !== null && !isContractionRunning ? (
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}
                  >
                    Last contraction: {formatDuration(lastContractionMs)}
                  </Text>
                ) : null}
                <Button
                  mode={isContractionRunning ? "contained-tonal" : "contained"}
                  icon={isContractionRunning ? "timer-off-outline" : "timer-outline"}
                  onPress={handleContractionTimerPress}
                  style={styles.actionButton}
                >
                  {isContractionRunning
                    ? `Stop Contraction (${formatDuration(elapsedMs)})`
                    : "Start Contraction Timer"}
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => setSetupVisible(true)}
                  style={styles.actionButton}
                >
                  Edit Pregnancy Start
                </Button>
              </View>
            </View>
          )}
        </SafeAreaView>

        <Portal>
          <Dialog
            visible={setupVisible}
            dismissable={!!startDateIso}
            onDismiss={() => {
              if (startDateIso) setSetupVisible(false);
            }}
          >
            <Dialog.Title style={{ textAlign: "center" }}>
              Set up Pregnancy Progress
            </Dialog.Title>
            <Dialog.Content style={{ gap: 12 }}>
              <Text variant="titleMedium">How would you like to begin?</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Every pregnancy is unique. We'll help track yours beautifully.
              </Text>

              <View style={styles.methodCards}>
                <Button
                  mode={setupMethod === "dueDate" ? "contained-tonal" : "outlined"}
                  onPress={() => {
                    setSetupMethod("dueDate");
                    setNotSurePath(null);
                  }}
                >
                  I know my due date
                </Button>

                <Button
                  mode={
                    setupMethod === "weeksPregnant" ? "contained-tonal" : "outlined"
                  }
                  onPress={() => {
                    setSetupMethod("weeksPregnant");
                    setNotSurePath(null);
                  }}
                >
                  I know how far along I am
                </Button>

                <Button
                  mode={setupMethod === "lastPeriod" ? "contained-tonal" : "outlined"}
                  onPress={() => {
                    setSetupMethod("lastPeriod");
                    setNotSurePath(null);
                  }}
                >
                  I know the first day of my last period
                </Button>

                <Button
                  mode={setupMethod === "notSure" ? "contained-tonal" : "outlined"}
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
                        disabled={parsedWeekValue >= 42}
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
                        disabled={parsedDayValue >= 6}
                        onPress={() => setDaysInput(String(parsedDayValue + 1))}
                      />
                    </View>
                  </View>
                </View>
              )}

              {(setupMethod === "dueDate" ||
                (setupMethod === "notSure" && notSurePath === "doctorDueDate")) && (
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
                  <Text variant="bodyMedium">No worries. Do you know any of these?</Text>
                  <Button
                    mode={notSurePath === "doctorDueDate" ? "contained-tonal" : "outlined"}
                    onPress={() => setNotSurePath("doctorDueDate")}
                  >
                    Doctor due date
                  </Button>
                  <Button
                    mode={notSurePath === "ultrasoundEstimate" ? "contained-tonal" : "outlined"}
                    onPress={() => setNotSurePath("ultrasoundEstimate")}
                  >
                    Ultrasound estimate
                  </Button>
                  <Button
                    mode={notSurePath === "lastPeriod" ? "contained-tonal" : "outlined"}
                    onPress={() => setNotSurePath("lastPeriod")}
                  >
                    First day of last period
                  </Button>
                  <Button
                    mode={notSurePath === "conceptionDate" ? "contained-tonal" : "outlined"}
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
                    value={
                      activeDateField === "dueDate"
                        ? dueDateInput
                        : activeDateField === "lastPeriod"
                          ? lastPeriodInput
                          : activeDateField === "conceptionDate"
                            ? conceptionDateInput
                            : positiveTestDateInput
                    }
                    mode="date"
                    display="spinner"
                    minimumDate={activeDateField === "dueDate" ? dueDateMin : undefined}
                    maximumDate={activeDateField === "dueDate" ? dueDateMax : today}
                    onChange={onDateChange}
                  />
                  <Button onPress={() => setShowDatePicker(false)}>Done</Button>
                </View>
              ) : null}

              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Your pregnancy timeline can always be updated later.
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Your pregnancy data stays private and on-device.
              </Text>

              {setupError ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
                  {setupError}
                </Text>
              ) : null}
            </Dialog.Content>
            <Dialog.Actions>
              {startDateIso ? (
                <Button onPress={() => setSetupVisible(false)}>Cancel</Button>
              ) : null}
              <Button loading={saving} mode="contained" onPress={handleSaveSetup}>
                Save
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {Platform.OS !== "ios" && showDatePicker && activeDateField ? (
          <DateTimePicker
            value={
              activeDateField === "dueDate"
                ? dueDateInput
                : activeDateField === "lastPeriod"
                  ? lastPeriodInput
                  : activeDateField === "conceptionDate"
                    ? conceptionDateInput
                    : positiveTestDateInput
            }
            mode="date"
            display="default"
            minimumDate={activeDateField === "dueDate" ? dueDateMin : undefined}
            maximumDate={activeDateField === "dueDate" ? dueDateMax : today}
            onChange={onDateChange}
          />
        ) : null}
      </ThemedView>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    padding: 4,
    gap: 10,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  progressSection: {
    width: "100%",
    alignItems: "center",
    marginTop: -8,
  },
  progressContent: {
    alignItems: "center",
    gap: 18,
    paddingVertical: 4,
    width: "100%",
  },
  progressRingWrapper: {
    width: 290,
    height: 290,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  progressRingCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: 212,
    height: 212,
    borderRadius: 106,
    paddingHorizontal: 20,
  },
  weeksText: {
    fontWeight: "bold",
  },
  subText: {
    textAlign: "center",
  },
  actionButton: {
    width: "100%",
    marginTop: 8,
  },
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
