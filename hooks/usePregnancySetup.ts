import { useCallback, useMemo, useState } from "react";
import { Platform } from "react-native";
import {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  clampPregnancyValue,
  DUE_DATE_MAX_EXTRA_DAYS,
  FULL_TERM_DAYS,
  MAX_DAY_IN_WEEK_INPUT,
  MAX_PREGNANCY_WEEK_INPUT,
} from "@/constants/Pregnancy";
import type {
  DateFieldKey,
  NotSurePath,
  SetupMethod,
} from "@/components/pregnancy/pregnancySetupTypes";
import { addDays, startOfLocalDay } from "@/utils/dates";
import { savePregnancyAnchor } from "@/db/pregnancyAnchor";
import {
  anchorFromSetupAnswer,
  setupDefaultsFromAnchor,
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

  /**
   * Open the dialog on what is already stored.
   *
   * The arithmetic is in utils/pregnancyDates.ts, both directions of it. This
   * used to re-derive pregnancy day zero and the due date here, by the same
   * steps gestationalAge had already taken, and to read the two settings for
   * itself with its own validation.
   */
  const hydrateFromAnchor = useCallback(
    (anchor: { startDateIso: string | null; gestationOffsetDays: number }) => {
      const defaults = setupDefaultsFromAnchor(anchor, startOfLocalDay());

      setDueDateInput(defaults.dueDate);
      setLastPeriodInput(defaults.lastPeriod);
      setConceptionDateInput(defaults.conceptionDate);
      setWeeksInput(String(defaults.weeks));
      setDaysInput(String(defaults.days));
    },
    [],
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
              : conceptionDateInput;

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

      const anchor = anchorFromSetupAnswer(answer, today);

      await savePregnancyAnchor(anchor);
      onSaved(anchor.startDateIso, anchor.gestationOffsetDays);
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
    hydrateFromAnchor,
  };
}
