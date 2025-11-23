import { getAllDays } from "@/db/database";
import { DayData } from "@/constants/Interfaces";
import { CYCLE_PREDICTION_CONSTANTS } from "@/constants/CyclePrediction";

export function useFetchCycleData(
  setPredictedCycle: (values: string[]) => void,
) {
  const predictedDates: string[] = [];

  // get date in local time
  const day = new Date();
  const offset = day.getTimezoneOffset();
  const localDate = new Date(day.getTime() - offset * 60 * 1000);

  /**
   * Check if two dates are consecutive calendar days
   * Uses date comparison instead of millisecond difference to avoid DST/timezone issues
   */
  const areConsecutive = (date1: string, date2: string): boolean => {
    const d1 = new Date(date1 + "T00:00:00");
    const d2 = new Date(date2 + "T00:00:00");

    // Normalize to UTC midnight to avoid timezone issues
    const utcDate1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const utcDate2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());

    const diffDays = Math.abs((utcDate2 - utcDate1) / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  };

  /**
   * Group consecutive flow days into cycles
   * Respects manual cycle start/end markers when present
   */
  const renderCycles = (flowData: DayData[]) => {
    let lastDate: string | null = null;

    // Collect consecutive days and group them together
    const groupedDates: {
      dates: string[];
      startDate: string;
      endDate: string;
      isManuallyMarked: boolean;
    }[] = [];

    flowData.forEach((data) => {
      const isNewCycleStart = data.is_cycle_start === true;
      const isPreviousCycleEnd =
        groupedDates.length > 0 &&
        groupedDates[groupedDates.length - 1].endDate === lastDate &&
        flowData.find((d) => d.date === lastDate)?.is_cycle_end === true;

      // Start a new cycle if:
      // 1. Manual cycle start marker is set
      // 2. Previous cycle has a manual end marker
      // 3. Dates are not consecutive (gap detected)
      const shouldStartNewCycle =
        isNewCycleStart ||
        isPreviousCycleEnd ||
        !lastDate ||
        !areConsecutive(lastDate, data.date);

      if (lastDate && !shouldStartNewCycle) {
        // If last date is consecutive and no markers, add to current group
        const lastGroup = groupedDates[groupedDates.length - 1];
        lastGroup.dates.push(data.date);
        lastGroup.endDate = data.date;
      } else {
        // Create a new group
        groupedDates.push({
          dates: [data.date],
          startDate: data.date,
          endDate: data.date,
          isManuallyMarked: isNewCycleStart,
        });
      }

      lastDate = data.date;
    });

    return groupedDates;
  };

  /**
   * Calculate average cycle length from historical data
   * A cycle is defined as the number of days from one cycle start to the next
   * Prioritizes manually marked cycles for accuracy
   */
  const calculateAverageCycleLength = (
    cycles: {
      dates: string[];
      startDate: string;
      endDate: string;
      isManuallyMarked: boolean;
    }[],
  ): number => {
    // Filter to only valid cycles (3+ consecutive days)
    const validCycles = cycles.filter(
      (cycle) =>
        cycle.dates.length >= CYCLE_PREDICTION_CONSTANTS.MIN_CONSECUTIVE_DAYS,
    );

    // Need at least 2 cycles to calculate an average
    if (validCycles.length < 2) {
      return CYCLE_PREDICTION_CONSTANTS.DEFAULT_CYCLE_LENGTH;
    }

    // Calculate the number of days between cycle starts
    const cycleLengths: number[] = [];
    for (let i = 1; i < validCycles.length; i++) {
      const prevCycleStart = new Date(
        validCycles[i - 1].startDate + "T00:00:00",
      );
      const currCycleStart = new Date(validCycles[i].startDate + "T00:00:00");

      const diffTime = currCycleStart.getTime() - prevCycleStart.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      // Only include reasonable cycle lengths
      if (
        diffDays >= CYCLE_PREDICTION_CONSTANTS.MIN_CYCLE_LENGTH &&
        diffDays <= CYCLE_PREDICTION_CONSTANTS.MAX_CYCLE_LENGTH
      ) {
        cycleLengths.push(diffDays);
      }
    }

    // If no valid cycle lengths found, use default
    if (cycleLengths.length === 0) {
      return CYCLE_PREDICTION_CONSTANTS.DEFAULT_CYCLE_LENGTH;
    }

    // Calculate average and round to nearest day
    const sum = cycleLengths.reduce((acc, length) => acc + length, 0);
    return Math.round(sum / cycleLengths.length);
  };

  const fetchCycleData = async () => {
    try {
      const allDays = await getAllDays();
      const flowDays = allDays.filter((day) => day.flow_intensity);

      // No flow data means no predictions
      if (flowDays.length === 0) {
        setPredictedCycle([]);
        return [];
      }

      const sortedFlowDays: DayData[] = flowDays
        .map((day) => ({
          ...day,
          flow_intensity: day.flow_intensity ?? 0,
          is_cycle_start: day.is_cycle_start ?? undefined,
          is_cycle_end: day.is_cycle_end ?? undefined,
          notes: day.notes ?? undefined,
        }))
        .sort((a, b) => {
          const dateA = new Date(`${a.date}`).valueOf();
          const dateB = new Date(`${b.date}`).valueOf();
          return dateA > dateB ? 1 : -1;
        });

      const cycles = renderCycles(sortedFlowDays);

      // Filter to only valid cycles (3+ consecutive days)
      const validCycles = cycles.filter(
        (cycle) =>
          cycle.dates.length >= CYCLE_PREDICTION_CONSTANTS.MIN_CONSECUTIVE_DAYS,
      );

      // Need at least one valid cycle to make predictions
      if (validCycles.length === 0) {
        setPredictedCycle([]);
        return [];
      }

      // Get the most recent valid cycle
      const lastCycle = validCycles[validCycles.length - 1];

      // Calculate adaptive cycle length
      const averageCycleLength = calculateAverageCycleLength(cycles);

      // Generate predictions for multiple future cycles
      const maxCycles = CYCLE_PREDICTION_CONSTANTS.MAX_FUTURE_CYCLES;
      const lastCycleStartDate = new Date(lastCycle.startDate + "T00:00:00");
      const cycleDuration = lastCycle.dates.length;

      for (let cycleNum = 1; cycleNum <= maxCycles; cycleNum++) {
        // Calculate the start date of the predicted cycle
        const predictedCycleStart = new Date(lastCycleStartDate);
        predictedCycleStart.setDate(
          predictedCycleStart.getDate() + averageCycleLength * cycleNum,
        );

        // Only include future predictions
        if (predictedCycleStart <= localDate) {
          continue;
        }

        // Add each day of the predicted cycle
        for (let day = 0; day < cycleDuration; day++) {
          const predictedDate = new Date(predictedCycleStart);
          predictedDate.setDate(predictedDate.getDate() + day);

          // Only add if it's in the future
          if (predictedDate > localDate) {
            predictedDates.push(predictedDate.toISOString().split("T")[0]);
          }
        }
      }

      setPredictedCycle(predictedDates);
      return predictedDates;
    } catch (error) {
      console.error("Error fetching cycle data:", error);
      setPredictedCycle([]);
      return [];
    }
  };

  return { fetchCycleData };
}
