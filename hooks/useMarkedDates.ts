import { useState, useEffect } from "react";
import { getDay } from "@/db/database";
import type { DayData, MarkedDates } from "@/constants/Interfaces";
import { useSelectedDate } from "@/assets/src/calendar-storage";
import { FlowColors } from "@/constants/Colors";
import { useLiveFilteredData } from "@/hooks/useLiveFilteredData";
import { symptomOptions, anySymptomOption } from "@/constants/Symptoms";
import { moodOptions, anyMoodOption } from "@/constants/Moods";
import {
  medicationOptions,
  anyMedicationOption,
} from "@/constants/Medications";
import {
  birthControlOptions,
  anyBirthControlOption,
} from "@/constants/BirthControlTypes";

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
  day,
  dayValues,
  prevDayValues,
  nextDayValues,
  options,
  anyOption,
}: {
  markedDates: MarkedDates;
  filters: { label: string; value: string; color: string }[];
  day: DayData;
  dayValues: string[];
  prevDayValues: string[];
  nextDayValues: string[];
  options: { label: string; value: string }[];
  anyOption: { label: string; value: string };
}) {
  const relevantFilters = filters.filter(
    (filter) =>
      filter.value === anyOption.value ||
      options.some((option) => option.value === filter.value),
  );

  if (relevantFilters.length > 0) {
    if (!markedDates[day.date])
      markedDates[day.date] = { selected: false, periods: [] };

    if (dayValues?.length === 0) {
      markedDates[day.date].periods.push({
        color: "transparent",
      });
    }
    for (const filter of relevantFilters) {
      const match =
        dayValues.includes(filter.value) || filter.value === anyOption.value;

      if (match) {
        const prevMatch =
          prevDayValues.includes(filter.value) ||
          (filter.value === anyOption.value && prevDayValues.length > 0);

        const nextMatch =
          nextDayValues.includes(filter.value) ||
          (filter.value === anyOption.value && nextDayValues.length > 0);

        const { isStartingDay, isEndingDay } = getStartingAndEndingDay(
          day.date,
          prevMatch ? prevDayValues[prevDayValues.length - 1] : undefined,
          nextMatch ? nextDayValues[0] : undefined,
        );

        markedDates[day.date].periods.push({
          startingDay: isStartingDay,
          endingDay: isEndingDay,
          color: filter.color,
        });
      } else {
        markedDates[day.date].periods.push({
          color: "transparent",
        });
      }
    }
  }
}

function markedDatesBuilder(
  filters: { label: string; value: string; color: string }[],
  data: DayData[],
) {
  const markedDates: MarkedDates = {};

  data.forEach((day, index) => {
    // flow
    if (filters.some((filter) => filter.value === "flow")) {
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
    const notesFilter = filters.find((filter) => filter.value === "notes");
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
          color: notesFilter.color,
        });
      }
    }

    // symptoms
    applyFilterToMarkedDates({
      markedDates,
      filters,
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
      day,
      dayValues: day.medications ?? [],
      prevDayValues: data[index - 1]?.medications ?? [],
      nextDayValues: data[index + 1]?.medications ?? [],
      options: birthControlOptions,
      anyOption: anyBirthControlOption,
    });
  });

  /*
  for (const date in markedDates) {
    console.log(date);
    for (const period in markedDates[date].periods) {
      console.log(markedDates[date].periods[period]);
    }
  } */

  return markedDates;
}

export function useMarkedDates(
  calendarFilters?: { label: string; value: string; color: string }[],
) {
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const filteredData = useLiveFilteredData(
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
    function refreshCalendar(allDays: DayData[]) {
      if (!allDays || allDays.length === 0) {
        setMarkedDates((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((date) => {
            updated[date] = { ...updated[date], periods: [] };
          });
          return updated;
        });
        setDate(today);
        return;
      }

      const newMarkedDates = markedDatesBuilder(calendarFilters ?? [], allDays);
      // log marked dates
      // for (const date in newMarkedDates) {
      //   console.log(date);
      //   for (const period in newMarkedDates[date].periods) {
      //     console.log(newMarkedDates[date].periods[period]);
      //   }
      // }

      setMarkedDates(newMarkedDates);
      setDate(today);
    }
    refreshCalendar(filteredData as DayData[]);
  }, [filteredData, today, setDate]);

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

  return { markedDates };
}
