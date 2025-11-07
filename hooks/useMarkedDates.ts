import { useState, useEffect, useRef } from "react";
import {
  getDay,
  getAllVisibleSymptoms,
  getAllVisibleMoods,
  getAllVisibleMedications,
} from "@/db/database";
import type { DayData, MarkedDates } from "@/constants/Interfaces";
import {
  usePredictedCycle,
  useSelectedDate,
  usePredictionChoice,
} from "@/assets/src/calendar-storage";
import { FlowColors, FilterColorsDark, FilterColorsLight } from "@/constants/Colors";
import { useLiveFilteredData } from "@/hooks/useLiveFilteredData";
import { anySymptomOption } from "@/constants/Symptoms";
import { anyMoodOption } from "@/constants/Moods";
import { anyMedicationOption } from "@/constants/Medications";
import { anyBirthControlOption } from "@/constants/BirthControlTypes";
import { useTheme } from "react-native-paper";
import { useFetchCycleData } from "./useFetchCycleData";

function getStartingAndEndingDay(
  day: string,
  prevDay: string | undefined,
  nextDay: string | undefined,
) {
  const DAY_LENGTH = 24 * 60 * 60 * 1000;
  const date = new Date(day);

  const isStartingDay =
    !prevDay || date.getTime() - new Date(prevDay).getTime() > DAY_LENGTH;

  const isEndingDay =
    !nextDay || new Date(nextDay).getTime() - date.getTime() > DAY_LENGTH;

  return {
    isStartingDay,
    isEndingDay,
  };
}

function applyFilterToMarkedDates({
  markedDates,
  filters,
  filterColors,
  day,
  dayValues,
  prevDayValues,
  nextDayValues,
  options,
  anyOption,
}: {
  markedDates: MarkedDates;
  filters: string[];
  filterColors: string[];
  day: DayData;
  dayValues: string[];
  prevDayValues: string[];
  nextDayValues: string[];
  options: string[];
  anyOption: string;
}) {
  const relevantFilters = filters.filter(
    (filter) => filter === anyOption || options.includes(filter),
  );

  if (relevantFilters.length > 0) {
    if (!markedDates[day.date])
      markedDates[day.date] = { selected: false, periods: [] };

    if (dayValues?.length === 0) {
      markedDates[day.date].periods.push({
        color: "transparent",
      });
      return;
    }

    for (const filter of relevantFilters) {
      const match = dayValues.includes(filter) || filter === anyOption;

      if (match) {
        const filterIndex = filters.findIndex((f) => f === filter);
        const prevMatch =
          prevDayValues.includes(filter) ||
          (filter === anyOption && prevDayValues.length > 0);

        const nextMatch =
          nextDayValues.includes(filter) ||
          (filter === anyOption && nextDayValues.length > 0);

        const { isStartingDay, isEndingDay } = getStartingAndEndingDay(
          day.date,
          prevMatch ? day.date : undefined,
          nextMatch ? day.date : undefined,
        );

        markedDates[day.date].periods.push({
          startingDay: isStartingDay,
          endingDay: isEndingDay,
          color: filterColors[filterIndex],
        });
      } else {
        markedDates[day.date].periods.push({
          color: "transparent",
        });
      }
    }
  }
}

async function markedDatesBuilder(
  filters: string[],
  data: DayData[],
  filterColors: string[],
) {
  const markedDates: MarkedDates = {};

  // Load all filter option names
  const symptomOptions = (await getAllVisibleSymptoms()).map((s) => s.name);
  const moodOptions = (await getAllVisibleMoods()).map((m) => m.name);

  const allMeds = await getAllVisibleMedications();
  const medicationOptions = allMeds
    .filter((m) => m.type !== "birth control")
    .map((m) => m.name);

  const birthControlOptions = allMeds
    .filter((m) => m.type === "birth control")
    .map((m) => m.name);

  data.forEach((day, index) => {
    // FLOW — unchanged
    if (filters.includes("Flow")) {
      const { isStartingDay, isEndingDay } = getStartingAndEndingDay(
        day.date,
        data[index - 1]?.flow_intensity > 0 ? data[index - 1]?.date : undefined,
        data[index + 1]?.flow_intensity > 0 ? data[index + 1]?.date : undefined,
      );
      if (!markedDates[day.date])
        markedDates[day.date] = { selected: false, periods: [] };

      if (!day.flow_intensity) {
        markedDates[day.date].periods.push({ color: "transparent" });
      } else {
        markedDates[day.date].periods.push({
          startingDay: isStartingDay,
          endingDay: isEndingDay,
          color: FlowColors[day.flow_intensity],
        });
      }
    }

    // NOTES
    const notesIndex = filters.findIndex((f) => f === "Notes");
    if (notesIndex !== -1) {
      if (!markedDates[day.date]) markedDates[day.date] = { selected: false, periods: [] };

      if (!day.notes) {
        markedDates[day.date].periods.push({ color: "transparent" });
      } else {
        markedDates[day.date].periods.push({
          startingDay: true,
          endingDay: true,
          color: filterColors[notesIndex],
        });
      }
    }

    // CYCLE START/END
    const startEndIndex = filters.findIndex((f) => f === "Cycle Start/End");
    if (startEndIndex !== -1) {
      if (!markedDates[day.date]) markedDates[day.date] = { selected: false, periods: [] };

      const isStartEnd = day.is_cycle_start || day.is_cycle_end;
      markedDates[day.date].periods.push({
        startingDay: true,
        endingDay: true,
        color: isStartEnd ? filterColors[startEndIndex] : "transparent",
      });
    }

    // SYMPTOMS
    applyFilterToMarkedDates({
      markedDates,
      filters,
      filterColors,
      day,
      dayValues: day.symptoms ?? [],
      prevDayValues: data[index - 1]?.symptoms ?? [],
      nextDayValues: data[index + 1]?.symptoms ?? [],
      options: symptomOptions,
      anyOption: anySymptomOption,
    });

    // MOODS
    applyFilterToMarkedDates({
      markedDates,
      filters,
      filterColors,
      day,
      dayValues: day.moods ?? [],
      prevDayValues: data[index - 1]?.moods ?? [],
      nextDayValues: data[index + 1]?.moods ?? [],
      options: moodOptions,
      anyOption: anyMoodOption,
    });

    // ✅ MEDICATIONS (non-BC)
    const medsToday = (day.medications ?? []).filter((m) =>
      medicationOptions.includes(m),
    );

    const medsPrev = (data[index - 1]?.medications ?? []).filter((m) =>
      medicationOptions.includes(m),
    );
    const medsNext = (data[index + 1]?.medications ?? []).filter((m) =>
      medicationOptions.includes(m),
    );

    applyFilterToMarkedDates({
      markedDates,
      filters,
      filterColors,
      day,
      dayValues: medsToday,
      prevDayValues: medsPrev,
      nextDayValues: medsNext,
      options: medicationOptions,
      anyOption: anyMedicationOption,
    });

    // ✅ BIRTH CONTROL ONLY
    const bcToday = (day.medications ?? []).filter((m) =>
      birthControlOptions.includes(m),
    );

    const bcPrev = (data[index - 1]?.medications ?? []).filter((m) =>
      birthControlOptions.includes(m),
    );
    const bcNext = (data[index + 1]?.medications ?? []).filter((m) =>
      birthControlOptions.includes(m),
    );

    applyFilterToMarkedDates({
      markedDates,
      filters,
      filterColors,
      day,
      dayValues: bcToday,
      prevDayValues: bcPrev,
      nextDayValues: bcNext,
      options: birthControlOptions,
      anyOption: anyBirthControlOption,
    });
  });

  return markedDates;
}

export function useMarkedDates(calendarFilters?: string[]) {
  const theme = useTheme();
  const colors = theme.dark ? FilterColorsDark : FilterColorsLight;
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const { loading, filteredData } = useLiveFilteredData(calendarFilters ?? []);
  const { date, setDate, setFlow, setId } = useSelectedDate();

  const { setPredictedCycle } = usePredictedCycle();
  const { predictionChoice } = usePredictionChoice();
  const { fetchCycleData } = useFetchCycleData(setPredictedCycle);
  const fetchCycleDataRef = useRef(fetchCycleData);
  fetchCycleDataRef.current = fetchCycleData;

  const day = new Date();
  const offset = day.getTimezoneOffset();
  const localDate = new Date(day.getTime() - offset * 60000);
  const today = localDate.toISOString().split("T")[0];

  useEffect(() => {
    async function refreshCalendar(allDays: DayData[]) {
      if (!allDays || allDays.length === 0) {
        setMarkedDates({});
        setDate(date);
        return;
      }

      const newMarkedDates = await markedDatesBuilder(
        calendarFilters ?? [],
        allDays,
        colors,
      );

      if (
        calendarFilters?.includes("Cycle Prediction") &&
        predictionChoice === true
      ) {
        const predicted = await fetchCycleDataRef.current();
        const predictedMarked: MarkedDates = {};
        const index = calendarFilters.indexOf("Cycle Prediction");

        predicted.forEach((d) => {
          predictedMarked[d] = {
            selected: false,
            periods: [
              { startingDay: true, endingDay: true, color: colors[index] },
            ],
          };
        });

        setMarkedDates({ ...predictedMarked, ...newMarkedDates });
      } else {
        setMarkedDates(newMarkedDates);
      }

      setDate(date);
    }

    refreshCalendar(filteredData as DayData[]);
  }, [filteredData, date, calendarFilters, colors, predictionChoice]);

  useEffect(() => {
    if (!date) return;

    async function updateSelected() {
      const day = await getDay(date);

      setFlow(day?.flow_intensity ?? 0);
      setId(day?.id ?? 0);

      setMarkedDates((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((d) => {
          updated[d].selected = false;
        });
        updated[date] = updated[date]
          ? { ...updated[date], selected: true }
          : { selected: true, periods: [] };

        return updated;
      });
    }

    updateSelected();
  }, [date]);

  return { loading, markedDates };
}

