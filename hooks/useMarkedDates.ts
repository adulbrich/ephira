import { useState, useEffect } from "react";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { getDay, getDrizzleDatabase } from "@/db/database";
import type { DayData, MarkedDates } from "@/constants/Interfaces";
import { useSelectedDate } from "@/assets/src/calendar-storage";
import * as schema from "@/db/schema";
import { FlowColors } from "@/constants/Colors";
import { ne } from "drizzle-orm";

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

export function useMarkedDates() {
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});

  // access state management
  const { date, setDate, setFlow, setId } = useSelectedDate();

  const db = getDrizzleDatabase();
  const { data } = useLiveQuery(
    db
      .select()
      .from(schema.days)
      .where(ne(schema.days.flow_intensity, 0))
      .orderBy(schema.days.date),
  );

  // get date in local time
  const day = new Date();
  const offset = day.getTimezoneOffset();
  const localDate = new Date(day.getTime() - offset * 60 * 1000);
  const today = localDate.toISOString().split("T")[0];

  // useLiveQuery will automatically update the calendar when the db data changes
  useEffect(() => {
    function refreshCalendar(allDays: DayData[]) {
      for (const day of allDays) {
        console.log(day);
      }
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

      const newMarkedDates: MarkedDates = {};
      allDays.forEach((day, index) => {
        const { isStartingDay, isEndingDay } = getStartingAndEndingDay(
          day.date,
          allDays[index - 1]?.date,
          allDays[index + 1]?.date,
        );

        newMarkedDates[day.date] = {
          selected: day.date === today,
          periods: [
            {
              startingDay: isStartingDay,
              endingDay: isEndingDay,
              color: FlowColors[day.flow_intensity] || "transparent",
            },
          ],
        };
      });

      setMarkedDates(newMarkedDates);
      setDate(today);
    }
    refreshCalendar(data as DayData[]);
  }, [data, today, setDate]);

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
