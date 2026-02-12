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
import { FlowColors } from "@/constants/Colors";
import { getFlowTypeString } from "@/constants/Flow";
import { useLiveFilteredData } from "@/hooks/useLiveFilteredData";
import { anySymptomOption } from "@/constants/Symptoms";
import { anyMoodOption } from "@/constants/Moods";
import { anyMedicationOption } from "@/constants/Medications";
import { anyBirthControlOption } from "@/constants/BirthControlTypes";
import { useTheme } from "react-native-paper";
import { FilterColorsDark, FilterColorsLight } from "@/constants/Colors";
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
    isStartingDay: isStartingDay,
    isEndingDay: isEndingDay,
  };
}

/**
 * Apply opacity to a hex color string
 * @param hexColor - Color in #RRGGBB or #RRGGBBAA format
 * @param opacity - Opacity value from 0 to 1
 * @returns Color in rgba() format
 */
function applyOpacityToColor(hexColor: string, opacity: number): string {
  // Remove # if present
  const hex = hexColor.replace("#", "");

  // Parse RGB values
  let r: number, g: number, b: number;

  if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else if (hex.length === 8) {
    // Already has alpha channel
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    // Invalid format, return original
    return hexColor;
  }

  // Return rgba format
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
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

  // Check if any birth control filter is enabled
  const birthControlFiltersEnabled = filters.some(
    (filter) =>
      filter === anyBirthControlOption || birthControlOptions.includes(filter),
  );

  // Check if intercourse filter is enabled
  const intercourseFilterEnabled = filters.includes("Intercourse");

  data.forEach((day, index) => {
    // Check if day has birth control logged (only show star if filter is enabled)
    let hasBirthControl = false;
    if (birthControlFiltersEnabled) {
      const dayBirthControl = day.medications?.filter((med) =>
        birthControlOptions.includes(med),
      ) ?? [];

      // Check if "Any Birth Control" is selected or if a specific type matches
      if (filters.includes(anyBirthControlOption)) {
        hasBirthControl = dayBirthControl.length > 0;
      } else {
        // Check for specific birth control types
        hasBirthControl = dayBirthControl.some((med) => filters.includes(med));
      }
    }

    // Check if day has intercourse logged (only show heart if filter is enabled)
    const hasIntercourse = intercourseFilterEnabled && day.intercourse === true;

    // Initialize marked date entry if needed
    if (!markedDates[day.date]) {
      markedDates[day.date] = { selected: false, periods: [], hasBirthControl, hasIntercourse };
    } else {
      markedDates[day.date].hasBirthControl = hasBirthControl;
      markedDates[day.date].hasIntercourse = hasIntercourse;
    }

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
        const flowType = getFlowTypeString(day.flow_intensity);
        markedDates[day.date].periods.push({
          startingDay: isStartingDay,
          endingDay: isEndingDay,
          color: flowType ? FlowColors[flowType] : "transparent",
        });
      }
    }

    // notes
    const notesFilter = filters.includes("Notes");
    const notesIndex = filters.findIndex((filter) => filter === "Notes");
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

    // Cycle Start/End
    const startEndFilter = filters.includes("Cycle Start/End");
    const startEndIndex = filters.findIndex(
      (filter) => filter === "Cycle Start/End",
    );
    if (startEndFilter) {
      if (!markedDates[day.date])
        markedDates[day.date] = { selected: false, periods: [] };

      if (day.is_cycle_start === false && day.is_cycle_end === false) {
        markedDates[day.date].periods.push({
          color: "transparent",
        });
      } else {
        markedDates[day.date].periods.push({
          startingDay: true,
          endingDay: true,
          color: filterColors[startEndIndex],
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

    // birth control is handled via stars (hasBirthControl flag) instead of period lines
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

  const { setPredictedCycle } = usePredictedCycle();
  const { predictionChoice } = usePredictionChoice();
  const { fetchCycleData } = useFetchCycleData(setPredictedCycle);
  const fetchCycleDataRef = useRef(fetchCycleData);
  fetchCycleDataRef.current = fetchCycleData;

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

      if (
        calendarFilters?.includes("Cycle Prediction") &&
        predictionChoice === true
      ) {
        const newPredictedDates = await fetchCycleDataRef.current();
        const newPredictedMarkedDates: MarkedDates = {};
        const index = calendarFilters?.indexOf("Cycle Prediction");

        newPredictedDates.forEach((prediction) => {
          // Calculate opacity AND height based on confidence level
          // High confidence (80-100): full opacity, tall marker (16px)
          // Medium confidence (50-79): 70% opacity, medium marker (12px)
          // Low confidence (0-49): 40% opacity, short marker (8px)
          let opacity = 1.0;
          let height = 16; // Default height

          if (prediction.confidence < 50) {
            opacity = 0.4;
            height = 8; // Small marker for low confidence
          } else if (prediction.confidence < 80) {
            opacity = 0.7;
            height = 12; // Medium marker for medium confidence
          }
          // High confidence keeps defaults (1.0 opacity, 16px height)

          // Get the base color and apply opacity
          const baseColor = colors[index];
          const colorWithOpacity = applyOpacityToColor(baseColor, opacity);

          newPredictedMarkedDates[prediction.date] = {
            selected: false,
            periods: [
              {
                startingDay: true,
                endingDay: true,
                color: colorWithOpacity,
                height: height, // Apply custom height
              },
            ],
          };
        });
        setMarkedDates({ ...newPredictedMarkedDates, ...newMarkedDates });
      } else {
        setMarkedDates({ ...newMarkedDates });
      }

      setDate(date);
    }

    refreshCalendar(filteredData as DayData[]);
  }, [filteredData, date, setDate, calendarFilters, colors, predictionChoice]);

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
