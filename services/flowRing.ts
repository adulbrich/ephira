import { FlowColors, type FlowType } from "@/constants/Colors";
import {
  FLOW_TAIL_COLOR,
  MAX_FLOW_LENGTH,
  getFlowTypeString,
} from "@/constants/Flow";
import { formatAsISODate } from "@/utils/dates";
import type { DayData } from "@/constants/Interfaces";

/**
 * What the home screen's flow ring draws, given the Days and a reference day.
 *
 * These rules used to be computed inline in the render, so the only way to
 * observe any of them was to mount an SVG. The gradient had a test that its own
 * header admitted was a hand-copy of the code rather than the code itself.
 *
 * `referenceDay` is a required parameter, per the convention
 * `services/cyclePredictionLogic.ts:139-140` sets: no module here reads the
 * clock, because a hidden input cannot be varied by a test.
 */

/** Where the gap at the top of the ring sits. */
const RING_START_ANGLE = 270;
const RING_SWEEP_START = 8;
const RING_SWEEP_END = 352;

/** Room left at the end of the gradient for the tail fade. */
const MAX_GRADIENT_OFFSET = 90;

export type GradientStop = { offset: string; color: string };

/**
 * Only the two fields the gradient reads, and `flow_intensity` as nullable.
 *
 * `DayData` declares it `number`, which is not true: the `days.flow_intensity`
 * column is nullable, and the callers below handle `undefined` and `null`.
 */
export type FlowDay = { date: string; flow_intensity?: number | null };

/**
 * The gradient the ring is painted with, and the flow types it came from.
 *
 * Unique flow types in order of first appearance, with "None" excluded, so a
 * day logged as no flow cannot change the colour of the ring.
 */
export function gradientStops(monthDays: FlowDay[]): {
  stops: GradientStop[];
  flowStatesInOrder: FlowType[];
} {
  if (monthDays.length === 0) {
    return {
      stops: [
        { offset: "0%", color: FlowColors.spotting },
        { offset: `${MAX_GRADIENT_OFFSET}%`, color: FlowColors.heavy },
        { offset: "95%", color: FLOW_TAIL_COLOR },
      ],
      flowStatesInOrder: [],
    };
  }

  const sortedData = [...monthDays].sort((a, b) => {
    const dateA = new Date(`${a.date}T00:00:00Z`).getTime();
    const dateB = new Date(`${b.date}T00:00:00Z`).getTime();
    return dateA - dateB;
  });

  const seen = new Set<FlowType>();
  const uniqueFlowTypes: FlowType[] = [];

  for (const data of sortedData) {
    if (!data.flow_intensity || data.flow_intensity === 0) continue;
    const flowType = getFlowTypeString(data.flow_intensity);
    if (flowType && !seen.has(flowType)) {
      seen.add(flowType);
      uniqueFlowTypes.push(flowType);
    }
  }

  const stops: GradientStop[] = [];

  if (uniqueFlowTypes.length === 0) {
    stops.push(
      { offset: "0%", color: FlowColors.spotting },
      { offset: `${MAX_GRADIENT_OFFSET}%`, color: FlowColors.heavy },
    );
  } else if (uniqueFlowTypes.length === 1) {
    const color = FlowColors[uniqueFlowTypes[0]];
    stops.push(
      { offset: "0%", color },
      { offset: `${MAX_GRADIENT_OFFSET}%`, color },
    );
  } else {
    uniqueFlowTypes.forEach((flowType, index) => {
      const offset =
        (index / (uniqueFlowTypes.length - 1)) * MAX_GRADIENT_OFFSET;
      stops.push({ offset: `${offset}%`, color: FlowColors[flowType] });
    });
  }

  stops.push({ offset: "95%", color: FLOW_TAIL_COLOR });

  return { stops, flowStatesInOrder: uniqueFlowTypes };
}

export type FlowRing = {
  /** The Days in the reference month that have flow. */
  monthDays: DayData[];
  flowDayCount: number;
  /** How full the ring is, capped at one full turn. */
  progress: number;
  daysInMonth: number;
  /** Where the marker for the reference day sits, in degrees. */
  markerAngle: number;
  stops: GradientStop[];
  flowStatesInOrder: FlowType[];
};

export function flowRing(days: DayData[], referenceDay: Date): FlowRing {
  const firstDayOfMonth = new Date(
    referenceDay.getFullYear(),
    referenceDay.getMonth(),
    1,
  );
  const lastDayOfMonth = new Date(
    referenceDay.getFullYear(),
    referenceDay.getMonth() + 1,
    0,
  );
  const daysInMonth = lastDayOfMonth.getDate();

  // formatAsISODate, not toISOString. The bounds are built from local calendar
  // components, and formatting them as UTC shifted the whole window by a day
  // anywhere east of Greenwich: in Berlin, August ran 31 July to 30 August.
  const firstDayString = formatAsISODate(firstDayOfMonth);
  const lastDayString = formatAsISODate(lastDayOfMonth);

  const monthDays = days.filter((day) => {
    const dayDateString = day.date.split("T")[0];
    return (
      dayDateString >= firstDayString &&
      dayDateString <= lastDayString &&
      day.flow_intensity &&
      day.flow_intensity > 0 // Explicitly exclude "None" (0)
    );
  });

  const dayNumber = referenceDay.getDate();
  const markerAngle =
    (RING_SWEEP_START +
      ((dayNumber - 1) * (RING_SWEEP_END - RING_SWEEP_START)) /
        (daysInMonth - 1) +
      RING_START_ANGLE) %
    360;

  const { stops, flowStatesInOrder } = gradientStops(monthDays);

  return {
    monthDays,
    flowDayCount: monthDays.length,
    progress: Math.min(monthDays.length / MAX_FLOW_LENGTH, 1),
    daysInMonth,
    markerAngle,
    stops,
    flowStatesInOrder,
  };
}
