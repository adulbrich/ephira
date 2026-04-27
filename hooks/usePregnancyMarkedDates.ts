import { useState, useEffect } from "react";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { getDrizzleDatabase } from "@/db/database";
import * as schema from "@/db/schema";
import type { MarkedDates } from "@/constants/Interfaces";
import { AppointmentColor, SpecialtyFilterColor } from "@/constants/Colors";
import { usePregnancySelectedDate } from "@/assets/src/pregnancy-storage";

const db = getDrizzleDatabase();

function buildPregnancyMarkedDates(
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
        markedDates[appt.date] = { selected: false, periods: [] };
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
      markedDates[day.date] = { selected: false, periods: [] };
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

export function usePregnancyMarkedDates(filters: string[]) {
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const { date } = usePregnancySelectedDate();

  const { data: pregnancyDaysData } = useLiveQuery(
    db.select().from(schema.pregnancyDays).orderBy(schema.pregnancyDays.date),
  );

  const { data: appointmentsData } = useLiveQuery(
    db
      .select()
      .from(schema.pregnancyAppointments)
      .orderBy(schema.pregnancyAppointments.date),
  );

  useEffect(() => {
    const days = (pregnancyDaysData ?? []) as schema.PregnancyDay[];
    const appts = (appointmentsData ?? []) as schema.PregnancyAppointment[];

    const newMarkedDates = buildPregnancyMarkedDates(filters, days, appts);
    setMarkedDates(newMarkedDates);
  }, [pregnancyDaysData, appointmentsData, filters]);

  // keep selected date highlighted
  useEffect(() => {
    if (!date) return;
    setMarkedDates((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((d) => {
        updated[d] = { ...updated[d], selected: false };
      });
      updated[date] = { ...(updated[date] ?? { periods: [] }), selected: true };
      return updated;
    });
  }, [date]);

  return { markedDates };
}
