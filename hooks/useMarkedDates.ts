import { useState, useEffect } from "react";
import {
  getDay,
  getAllVisibleSymptoms,
  getAllVisibleMoods,
  getAllVisibleMedications,
} from "@/db/database";
import type { DayData, MarkedDates } from "@/constants/Interfaces";
import { useSelectedDate } from "@/assets/src/calendar-storage";
import { FlowColors } from "@/constants/Colors";
import { useLiveFilteredData } from "@/hooks/useLiveFilteredData";
import { anySymptomOption } from "@/constants/Symptoms";
import { anyMoodOption } from "@/constants/Moods";
import { anyMedicationOption } from "@/constants/Medications";
import { anyBirthControlOption } from "@/constants/BirthControlTypes";
import { useTheme } from "react-native-paper";
import { FilterColorsDark, FilterColorsLight } from "@/constants/Colors";

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
    isStartingDay: isStartingDay,
    isEndingDay: isEndingDay,
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
          prevMatch ? prevDayValues[prevDayValues.length - 1] : undefined,
          nextMatch ? nextDayValues[0] : undefined,
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

  // get all visible symptoms, moods, medications, and birth control options
  const symptomOptions = await getAllVisibleSymptoms().then((symptoms) =>
    symptoms.map((symptom) => symptom.name),
  );
  const moodOptions = await getAllVisibleMoods().then((moods) =>
    moods.map((mood) => mood.name),
  );
  const medicationOptions = await getAllVisibleMedications().then(
    (medications) =>
      medications
        .filter((medication) => medication.type !== "birth control")
        .map((medication) => medication.name),
  );
  const birthControlOptions = await getAllVisibleMedications().then(
    (medications) =>
      medications
        .filter((medication) => medication.type === "birth control")
        .map((medication) => medication.name),
  );

  data.forEach((day, index) => {
    // flow
    if (filters.some((filter) => filter === "Flow")) {
      const { isStartingDay, isEndingDay } = getStartingAndEndingDay(
        day.date,
        data[index - 1]?.flow_intensity > 0 ? data[index - 1]?.date : undefined,
        data[index + 1]?.flow_intensity > 0 ? data[index + 1]?.date : undefined,
      );
      if (!markedDates[day.date])
        markedDates[day.date] = { selected: false, periods: [] };
      if (
        day.flow_intensity === undefined ||
        !day.flow_intensity ||
        day.flow_intensity === 0
      ) {
        markedDates[day.date].periods.push({
          color: "transparent",
        });
      } else {
        markedDates[day.date].periods.push({
          startingDay: isStartingDay,
          endingDay: isEndingDay,
          color: FlowColors[day.flow_intensity],
        });
      }
    }

    // notes
    const notesFilter = filters.includes("Notes");
    const notesIndex = filters.findIndex((filter) => filter === "notes");
    if (notesFilter) {
      if (!markedDates[day.date])
        markedDates[day.date] = { selected: false, periods: [] };

      if (day.notes === "") {
        markedDates[day.date].periods.push({
          color: "transparent",
        });
      } else {
        markedDates[day.date].periods.push({
          startingDay: true,
          endingDay: true,
          color: filterColors[notesIndex],
        });
      }
    }

    // symptoms
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

    // moods
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

    // medications
    applyFilterToMarkedDates({
      markedDates,
      filters,
      filterColors,
      day,
      dayValues: day.medications ?? [],
      prevDayValues: data[index - 1]?.medications ?? [],
      nextDayValues: data[index + 1]?.medications ?? [],
      options: medicationOptions,
      anyOption: anyMedicationOption,
    });

    // birth control (it's stored in day's medication array)
    applyFilterToMarkedDates({
      markedDates,
      filters,
      filterColors,
      day,
      dayValues: day.medications ?? [],
      prevDayValues: data[index - 1]?.medications ?? [],
      nextDayValues: data[index + 1]?.medications ?? [],
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
  const { loading, filteredData } = useLiveFilteredData(
    calendarFilters ? calendarFilters : [],
  );

  // access state management
  const { date, setDate, setFlow, setId } = useSelectedDate();

  // get date in local time
  const day = new Date();
  const offset = day.getTimezoneOffset();
  const localDate = new Date(day.getTime() - offset * 60 * 1000);
  const today = localDate.toISOString().split("T")[0];

  // useLiveQuery will automatically update the calendar when the db data changes
  useEffect(() => {
    async function refreshCalendar(allDays: DayData[]) {
      if (!allDays || allDays.length === 0) {
        setMarkedDates((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((date) => {
            updated[date] = { ...updated[date], periods: [] };
          });
          return updated;
        });
        setDate(date);
        return;
      }

      const newMarkedDates = await markedDatesBuilder(
        calendarFilters ?? [],
        allDays,
        colors,
      );

      setMarkedDates(newMarkedDates);
      setDate(date);
    }

    refreshCalendar(filteredData as DayData[]);
  }, [filteredData, date, setDate, calendarFilters, colors]);

  // get data for selected date on calendar (when user presses a different day)
  useEffect(() => {
    if (!date) return;

    async function fetchData() {
      const day = await getDay(date);

      //set other values of selecteDateState (if they exist)
      setFlow(day?.flow_intensity ? day.flow_intensity : 0);
      setId(day?.id ? day.id : 0);

      // reset old selected date
      setMarkedDates((prev) => {
        const updated = { ...prev };

        // set every date to selected = false
        Object.keys(updated).forEach((date) => {
          updated[date] = {
            ...updated[date],
            selected: false,
          };
        });

        // update selected date to selected = true
        updated[date] = {
          ...updated[date],
          selected: true,
        };

        return updated;
      });
    }

    fetchData();
  }, [date, setFlow, setId, today]);

  return { loading, markedDates };
}
