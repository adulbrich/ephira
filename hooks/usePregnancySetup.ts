import { useCallback, useMemo, useState } from "react";
import { Platform } from "react-native";
import {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { getSetting, updateSetting } from "@/db/database";
import { SettingsKeys } from "@/constants/Settings";
import {
  clampPregnancyValue,
  DAYS_FROM_LMP_TO_DUE,
  DEFAULT_DAYS_WHEN_UNCONFIGURED,
  DEFAULT_GESTATION_OFFSET_DAYS,
  DEFAULT_LMP_DAYS_AGO,
  DEFAULT_WEEKS_WHEN_UNCONFIGURED,
  DUE_DATE_MAX_EXTRA_DAYS,
  FULL_TERM_DAYS,
  MAX_DAY_IN_WEEK_INPUT,
  MAX_GESTATION_OFFSET_DAYS,
  MAX_PREGNANCY_WEEK_INPUT,
  MIN_GESTATION_OFFSET_DAYS,
  POSITIVE_TEST_DAYS_AFTER_LMP,
  CONCEPTION_DAYS_AFTER_LMP,
} from "@/constants/Pregnancy";
import type {
  DateFieldKey,
  NotSurePath,
  SetupMethod,
} from "@/components/pregnancy/pregnancySetupTypes";
import { addDays, startOfLocalDay } from "@/utils/dates";
import {
  anchorFromSetupAnswer,
  gestationalAge,
  type SetupAnswer,
} from "@/utils/pregnancyDates";

type UsePregnancySetupOptions = {
  today: Date;
  onSaved: (startDateIso: string, gestationOffsetDays: number) => void;
};

export function usePregnancySetup({
  today,
  onSaved,
}: UsePregnancySetupOptions) {
  const [setupVisible, setSetupVisible] = useState(false);
  const [dueDateInput, setDueDateInput] = useState(new Date());
  const [lastPeriodInput, setLastPeriodInput] = useState(new Date());
  const [conceptionDateInput, setConceptionDateInput] = useState(new Date());
  const [positiveTestDateInput, setPositiveTestDateInput] = useState(
    new Date(),
  );
  const [setupMethod, setSetupMethod] = useState<SetupMethod | null>(null);
  const [notSurePath, setNotSurePath] = useState<NotSurePath | null>(null);
  const [activeDateField, setActiveDateField] = useState<DateFieldKey | null>(
    null,
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [weeksInput, setWeeksInput] = useState("0");
  const [daysInput, setDaysInput] = useState("0");
  const [saving, setSaving] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const applyDefaultDateInputs = useCallback(
    (
      normalizedToday: Date,
      configured: boolean,
      currentPregnancyDay?: number,
    ) => {
      if (configured && currentPregnancyDay !== undefined) {
        const derivedDayZero = addDays(normalizedToday, -currentPregnancyDay);
        setDueDateInput(addDays(derivedDayZero, FULL_TERM_DAYS));
        setLastPeriodInput(derivedDayZero);
        setConceptionDateInput(
          addDays(derivedDayZero, CONCEPTION_DAYS_AFTER_LMP),
        );
        setPositiveTestDateInput(
          addDays(derivedDayZero, POSITIVE_TEST_DAYS_AFTER_LMP),
        );
        return;
      }

      setWeeksInput(DEFAULT_WEEKS_WHEN_UNCONFIGURED);
      setDaysInput(DEFAULT_DAYS_WHEN_UNCONFIGURED);
      setDueDateInput(addDays(normalizedToday, DAYS_FROM_LMP_TO_DUE));
      setLastPeriodInput(addDays(normalizedToday, -DEFAULT_LMP_DAYS_AGO));
      setConceptionDateInput(normalizedToday);
      setPositiveTestDateInput(addDays(normalizedToday, DEFAULT_LMP_DAYS_AGO));
    },
    [],
  );

  const hydrateFromSettings = useCallback(
    async (hasStartDate: boolean) => {
      const offsetSetting = await getSetting(
        SettingsKeys.pregnancyGestationOffsetDays,
      );
      const startSetting = await getSetting(SettingsKeys.pregnancyStartDate);
      const normalizedToday = startOfLocalDay();

      const offset = Number(offsetSetting?.value);
      const hasValidOffset =
        Number.isFinite(offset) &&
        offset >= MIN_GESTATION_OFFSET_DAYS &&
        offset <= MAX_GESTATION_OFFSET_DAYS;

      if (!hasValidOffset) {
        applyDefaultDateInputs(normalizedToday, false);
        return { gestationOffsetDays: DEFAULT_GESTATION_OFFSET_DAYS };
      }

      if (startSetting?.value) {
        const age = gestationalAge(startSetting.value, offset, normalizedToday);
        setWeeksInput(String(age.weekNumber));
        setDaysInput(String(age.dayInWeek));
        applyDefaultDateInputs(normalizedToday, true, age.pregnancyDay);
      } else {
        applyDefaultDateInputs(normalizedToday, false);
      }

      return { gestationOffsetDays: offset };
    },
    [applyDefaultDateInputs],
  );

  const dueDateMin = useMemo(() => addDays(today, 1), [today]);
  const dueDateMax = useMemo(
    () => addDays(today, FULL_TERM_DAYS + DUE_DATE_MAX_EXTRA_DAYS),
    [today],
  );

  const parsedWeekValue = useMemo(() => {
    const parsed = Number.parseInt(weeksInput, 10);
    if (Number.isNaN(parsed)) return 0;
    return clampPregnancyValue(parsed, 0, MAX_PREGNANCY_WEEK_INPUT);
  }, [weeksInput]);

  const parsedDayValue = useMemo(() => {
    const parsed = Number.parseInt(daysInput, 10);
    if (Number.isNaN(parsed)) return 0;
    return clampPregnancyValue(parsed, 0, MAX_DAY_IN_WEEK_INPUT);
  }, [daysInput]);

  const onDateChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
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
    },
    [activeDateField],
  );

  const openDatePicker = useCallback(
    (field?: DateFieldKey) => {
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
    },
    [
      activeDateField,
      conceptionDateInput,
      dueDateInput,
      dueDateMax,
      dueDateMin,
      lastPeriodInput,
      onDateChange,
      positiveTestDateInput,
      today,
    ],
  );

  const handleSaveSetup = useCallback(async () => {
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
      const weeksAndDaysAreValid = () =>
        !Number.isNaN(parsedWeeks) &&
        parsedWeeks >= 0 &&
        parsedWeeks <= MAX_PREGNANCY_WEEK_INPUT &&
        !Number.isNaN(parsedDays) &&
        parsedDays >= 0 &&
        parsedDays <= MAX_DAY_IN_WEEK_INPUT;

      const weeksAndDaysError = `Please choose a valid week (0-${MAX_PREGNANCY_WEEK_INPUT}) and day (0-${MAX_DAY_IN_WEEK_INPUT}).`;

      // Which question the user answered. The "not sure" paths lead back to
      // the same four answers rather than repeating their arithmetic.
      let answer: SetupAnswer;

      if (setupMethod === "dueDate") {
        answer = { method: "dueDate", dueDate: dueDateInput };
      } else if (setupMethod === "weeksPregnant") {
        if (!weeksAndDaysAreValid()) {
          setSetupError(weeksAndDaysError);
          return;
        }
        answer = {
          method: "weeksPregnant",
          weeks: parsedWeeks,
          days: parsedDays,
        };
      } else if (setupMethod === "lastPeriod") {
        answer = { method: "lastPeriod", lastPeriod: lastPeriodInput };
      } else if (!notSurePath) {
        setSetupError("Choose one option so we can estimate your timeline.");
        return;
      } else if (notSurePath === "doctorDueDate") {
        answer = { method: "dueDate", dueDate: dueDateInput };
      } else if (notSurePath === "ultrasoundEstimate") {
        if (!weeksAndDaysAreValid()) {
          setSetupError(weeksAndDaysError);
          return;
        }
        answer = {
          method: "weeksPregnant",
          weeks: parsedWeeks,
          days: parsedDays,
        };
      } else if (notSurePath === "lastPeriod") {
        answer = { method: "lastPeriod", lastPeriod: lastPeriodInput };
      } else {
        answer = {
          method: "conceptionDate",
          conceptionDate: conceptionDateInput,
        };
      }

      const { startDateIso: isoDate, gestationOffsetDays: offsetDays } =
        anchorFromSetupAnswer(answer, today);

      await Promise.all([
        updateSetting(SettingsKeys.pregnancyStartDate, isoDate),
        updateSetting(
          SettingsKeys.pregnancyGestationOffsetDays,
          String(offsetDays),
        ),
      ]);
      onSaved(isoDate, offsetDays);
      setSetupVisible(false);
    } finally {
      setSaving(false);
    }
  }, [
    conceptionDateInput,
    daysInput,
    dueDateInput,
    lastPeriodInput,
    notSurePath,
    onSaved,
    setupMethod,
    today,
    weeksInput,
  ]);

  return {
    setupVisible,
    setSetupVisible,
    dueDateInput,
    lastPeriodInput,
    conceptionDateInput,
    positiveTestDateInput,
    setupMethod,
    setSetupMethod,
    notSurePath,
    setNotSurePath,
    activeDateField,
    showDatePicker,
    setShowDatePicker,
    weeksInput,
    setWeeksInput,
    daysInput,
    setDaysInput,
    saving,
    setupError,
    dueDateMin,
    dueDateMax,
    parsedWeekValue,
    parsedDayValue,
    onDateChange,
    openDatePicker,
    handleSaveSetup,
    hydrateFromSettings,
  };
}
