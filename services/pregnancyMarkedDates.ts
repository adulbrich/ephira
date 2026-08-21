import type { MarkedDates } from "@/constants/Interfaces";
import { AppointmentColor, SpecialtyFilterColor } from "@/constants/Colors";
import type * as schema from "@/db/schema";

/**
 * How each date should be drawn in pregnancy mode. See CONTEXT.md, Marked Dates.
 *
 * Pregnancy marks are point events: every one of them is its own start and end,
 * with no runs and no adjacency. That is a different algorithm from cycle mode's
 * producing the same value type, which is one of the three reasons
 * `docs/adr/0001-keep-cycle-and-pregnancy-modes-separate.md` gives for the two
 * not sharing a builder.
 *
 * Its own module because that ADR's Consequences section asked for the hook
 * shell to be the only database-bound part. Exporting it in place was not
 * enough: `hooks/usePregnancyMarkedDates.ts` opens the database at module
 * scope, so importing the builder from there pulled expo-sqlite in and a test
 * had to mock a database to exercise a pure function.
 *
 * This mirrors the placement of `services/cycleMarkedDates.ts`. The two share
 * the file layout and the `MarkedDates` value type, and nothing else -- they
 * are different algorithms, which is the ADR's second discriminator.
 *
 * `pregnancyDays` arrives in the storage shape, with `symptoms` and `moods` as
 * JSON text, because `pregnancy_days` stores them that way.
 */
export function buildPregnancyMarkedDates(
  filters: string[],
  pregnancyDays: schema.PregnancyDay[],
  appointments: schema.PregnancyAppointment[],
): MarkedDates {
  const markedDates: MarkedDates = {};

  const appointmentsFilter = filters.includes("Appointments");
  const symptomsFilter = filters.includes("Symptoms");
  const moodsFilter = filters.includes("Moods");
  const kicksFilter = filters.includes("Kicks");
  const notesFilter = filters.includes("Notes");

  // Build appointment markers (dots on dates that have appointments)
  if (appointmentsFilter) {
    for (const appt of appointments) {
      if (!markedDates[appt.date]) {
        markedDates[appt.date] = { periods: [] };
      }
      // Only add one appointment period per date even if multiple appointments exist
      const alreadyHasAppt = markedDates[appt.date].periods.some(
        (p) => p.color === AppointmentColor,
      );
      if (!alreadyHasAppt) {
        markedDates[appt.date].periods.push({
          startingDay: true,
          endingDay: true,
          color: AppointmentColor,
        });
      }
    }
  }

  // Build day-level markers from pregnancyDays
  for (const day of pregnancyDays) {
    if (!markedDates[day.date]) {
      markedDates[day.date] = { periods: [] };
    }

    const daySymptoms: string[] = day.symptoms ? JSON.parse(day.symptoms) : [];
    const dayMoods: string[] = day.moods ? JSON.parse(day.moods) : [];

    if (symptomsFilter && daySymptoms.length > 0) {
      markedDates[day.date].periods.push({
        startingDay: true,
        endingDay: true,
        color: SpecialtyFilterColor,
      });
    }

    if (moodsFilter && dayMoods.length > 0) {
      markedDates[day.date].periods.push({
        startingDay: true,
        endingDay: true,
        color: SpecialtyFilterColor,
      });
    }

    if (kicksFilter && day.kicks != null && day.kicks > 0) {
      markedDates[day.date].periods.push({
        startingDay: true,
        endingDay: true,
        color: SpecialtyFilterColor,
      });
    }

    if (notesFilter && day.notes && day.notes.trim() !== "") {
      markedDates[day.date].periods.push({
        startingDay: true,
        endingDay: true,
        color: SpecialtyFilterColor,
      });
    }
  }

  return markedDates;
}
