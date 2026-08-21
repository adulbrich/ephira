import type {
  DayData,
  MarkedDates,
  PredictedDate,
} from "@/constants/Interfaces";
import type { Catalogue } from "@/db/catalogue";
import {
  FlowColors,
  CyclePredictionColor,
  SpecialtyFilterColor,
} from "@/constants/Colors";
import { getFlowTypeString } from "@/constants/Flow";
import { anySymptomOption } from "@/constants/Symptoms";
import { anyMoodOption } from "@/constants/Moods";
import { anyMedicationOption } from "@/constants/Medications";
import { anyBirthControlOption } from "@/constants/BirthControlTypes";

/**
 * How each date should be drawn in cycle mode. See CONTEXT.md, Marked Dates.
 *
 * This is the whole of the cycle marking rule set: runs, start and end caps,
 * adjacency to neighbouring days, the transparent spacers that keep bars
 * aligned, and confidence-scaled opacity for Prediction overlays. It used to
 * live inside an async effect in `hooks/useMarkedDates.ts`, where the opacity
 * thresholds in particular could not be reached by a test at any cost.
 *
 * Pure and synchronous, in the shape `services/cyclePredictionLogic.ts` set:
 * values in, values out, no database and no clock. The Catalogue arrives as a
 * parameter rather than being fetched here, which is the change that removes
 * the `async`; `hooks/useCatalogue.ts` supplies it, cached, in the shell.
 *
 * Pregnancy mode has its own rules and does not share these. See
 * `docs/adr/0001-keep-cycle-and-pregnancy-modes-separate.md`.
 */
export function cycleMarkedDates({
  days,
  filters,
  catalogue,
  predictions,
}: {
  /** In date order, as `useLoggedDaysLive` returns them. Adjacency depends on it. */
  days: DayData[];
  filters: string[];
  catalogue: Catalogue;
  /**
   * Empty when the Cycle Prediction filter is off or the choice is false. The
   * caller decides whether to forecast; this only draws what it is handed.
   */
  predictions: PredictedDate[];
}): MarkedDates {
  const predicted = predictedMarkedDates(predictions);
  const logged = loggedMarkedDates(days, filters, catalogue);

  // A logged Day wins over a Prediction on the same date: what happened
  // replaces what was forecast.
  return { ...predicted, ...logged };
}

const DAY_LENGTH = 24 * 60 * 60 * 1000;

function getStartingAndEndingDay(
  day: string,
  prevDay: string | undefined,
  nextDay: string | undefined,
) {
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

  if (hex.length === 6 || hex.length === 8) {
    // 8 already has an alpha channel, which the opacity argument replaces.
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

/**
 * Confidence-scaled opacity, one of the rules CONTEXT.md names as part of the
 * definition of Marked Dates. Height stays consistent with the flow bars; only
 * the alpha varies.
 */
function opacityForConfidence(confidence: number): number {
  if (confidence < 50) return 0.4;
  if (confidence < 80) return 0.7;
  return 1.0;
}

function predictedMarkedDates(predictions: PredictedDate[]): MarkedDates {
  const markedDates: MarkedDates = {};
  if (predictions.length === 0) return markedDates;

  const sorted = [...predictions].sort((a, b) => a.date.localeCompare(b.date));

  sorted.forEach((prediction, index) => {
    const { isStartingDay, isEndingDay } = getStartingAndEndingDay(
      prediction.date,
      sorted[index - 1]?.date,
      sorted[index + 1]?.date,
    );

    markedDates[prediction.date] = {
      periods: [
        {
          startingDay: isStartingDay,
          endingDay: isEndingDay,
          color: applyOpacityToColor(
            CyclePredictionColor,
            opacityForConfidence(prediction.confidence),
          ),
        },
      ],
    };
  });

  return markedDates;
}

function applyFilterToMarkedDates({
  markedDates,
  activeFilter,
  day,
  prevDay,
  nextDay,
  dayValues,
  prevDayValues,
  nextDayValues,
  anyOption,
}: {
  markedDates: MarkedDates;
  activeFilter: string;
  day: DayData;
  prevDay?: DayData;
  nextDay?: DayData;
  dayValues: string[];
  prevDayValues: string[];
  nextDayValues: string[];
  anyOption: string;
}) {
  if (!markedDates[day.date]) markedDates[day.date] = { periods: [] };

  const isAny = activeFilter === anyOption;
  const dayMatch = isAny
    ? dayValues.length > 0
    : dayValues.includes(activeFilter);

  if (!dayMatch) {
    markedDates[day.date].periods.push({ color: "transparent" });
    return;
  }

  const prevMatch = isAny
    ? prevDayValues.length > 0
    : prevDayValues.includes(activeFilter);

  const nextMatch = isAny
    ? nextDayValues.length > 0
    : nextDayValues.includes(activeFilter);

  const { isStartingDay, isEndingDay } = getStartingAndEndingDay(
    day.date,
    prevMatch ? prevDay?.date : undefined,
    nextMatch ? nextDay?.date : undefined,
  );

  markedDates[day.date].periods.push({
    startingDay: isStartingDay,
    endingDay: isEndingDay,
    color: SpecialtyFilterColor,
  });
}

function loggedMarkedDates(
  data: DayData[],
  filters: string[],
  catalogue: Catalogue,
): MarkedDates {
  const markedDates: MarkedDates = {};

  const symptomOptions = catalogue.symptoms;
  const moodOptions = catalogue.moods;
  const medicationOptions = catalogue.medications;
  const birthControlOptions = catalogue.birthControl;

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
      const dayBirthControl =
        day.medications?.filter((med) => birthControlOptions.includes(med)) ??
        [];

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
      markedDates[day.date] = {
        periods: [],
        hasBirthControl,
        hasIntercourse,
      };
    } else {
      markedDates[day.date].hasBirthControl = hasBirthControl;
      markedDates[day.date].hasIntercourse = hasIntercourse;
    }

    // flow
    if (filters.some((filter) => filter === "Flow")) {
      const { isStartingDay, isEndingDay } = getStartingAndEndingDay(
        day.date,
        // `?? 0` because flow_intensity is a nullable column. The type used
        // to say otherwise; the code below already defended against it.
        (data[index - 1]?.flow_intensity ?? 0) > 0
          ? data[index - 1]?.date
          : undefined,
        (data[index + 1]?.flow_intensity ?? 0) > 0
          ? data[index + 1]?.date
          : undefined,
      );
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
    if (notesFilter) {
      if (day.notes === "") {
        markedDates[day.date].periods.push({
          color: "transparent",
        });
      } else {
        markedDates[day.date].periods.push({
          startingDay: true,
          endingDay: true,
          color: SpecialtyFilterColor,
        });
      }
    }

    // Cycle Start/End
    const startEndFilter = filters.includes("Cycle Start/End");
    if (startEndFilter) {
      if (day.is_cycle_start === false && day.is_cycle_end === false) {
        markedDates[day.date].periods.push({
          color: "transparent",
        });
      } else {
        markedDates[day.date].periods.push({
          startingDay: true,
          endingDay: true,
          color: SpecialtyFilterColor,
        });
      }
    }

    // symptoms
    const symptomFilter = filters.find(
      (f) => f === anySymptomOption || symptomOptions.includes(f),
    );
    if (symptomFilter) {
      applyFilterToMarkedDates({
        markedDates,
        activeFilter: symptomFilter,
        day,
        prevDay: data[index - 1],
        nextDay: data[index + 1],
        dayValues: day.symptoms ?? [],
        prevDayValues: data[index - 1]?.symptoms ?? [],
        nextDayValues: data[index + 1]?.symptoms ?? [],
        anyOption: anySymptomOption,
      });
    }

    // moods
    const moodFilter = filters.find(
      (f) => f === anyMoodOption || moodOptions.includes(f),
    );
    if (moodFilter) {
      applyFilterToMarkedDates({
        markedDates,
        activeFilter: moodFilter,
        day,
        prevDay: data[index - 1],
        nextDay: data[index + 1],
        dayValues: day.moods ?? [],
        prevDayValues: data[index - 1]?.moods ?? [],
        nextDayValues: data[index + 1]?.moods ?? [],
        anyOption: anyMoodOption,
      });
    }

    // medications
    const medicationFilter = filters.find(
      (f) => f === anyMedicationOption || medicationOptions.includes(f),
    );
    if (medicationFilter) {
      applyFilterToMarkedDates({
        markedDates,
        activeFilter: medicationFilter,
        day,
        prevDay: data[index - 1],
        nextDay: data[index + 1],
        dayValues: day.medications ?? [],
        prevDayValues: data[index - 1]?.medications ?? [],
        nextDayValues: data[index + 1]?.medications ?? [],
        anyOption: anyMedicationOption,
      });
    }

    // birth control is handled via stars (hasBirthControl flag) instead of period lines
  });

  return markedDates;
}
