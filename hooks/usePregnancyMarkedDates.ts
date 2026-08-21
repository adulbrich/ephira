import { useState, useEffect } from "react";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { getDrizzleDatabase } from "@/db/database";
import * as schema from "@/db/schema";
import type { MarkedDates } from "@/constants/Interfaces";
import { buildPregnancyMarkedDates } from "@/services/pregnancyMarkedDates";

const db = getDrizzleDatabase();

export function usePregnancyMarkedDates(filters: string[]) {
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});

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

  // Selection is applied by the calendar screen at render, where the Selected
  // Date and the theme colours it needs both live. The effect that used to
  // maintain it here wrote a field its only consumer overwrote unconditionally.

  return { markedDates };
}
