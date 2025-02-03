import { useState, useEffect } from "react";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { getDay, getDrizzleDatabase } from "@/db/database";
import type { DayData, MarkedDates } from "@/constants/Interfaces";
import { useSelectedDate } from "@/assets/src/calendar-storage";
import * as schema from "@/db/schema";
import { FlowColors } from "@/constants/Colors";

export function useMarkedDates() {
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});

  // access state management
  const { date, setDate, setFlow, setId } = useSelectedDate();

  const db = getDrizzleDatabase();
  const { data } = useLiveQuery(db.select().from(schema.days));

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
            updated[date] = { ...updated[date], marked: false };
          });
          return updated;
        });
        setDate(today);
        return;
      }

      const newMarkedDates: MarkedDates = {};
      allDays.forEach((day) => {
        newMarkedDates[day.date] = {
          marked: true,
          dotColor:
            day.flow_intensity > 0
              ? FlowColors[day.flow_intensity]
              : "transparent",
          selected: day.date === today,
        };
      });

      setMarkedDates(newMarkedDates);
      setDate(today);
    }
    refreshCalendar(data as DayData[]);
  }, [data, today]); // eslint-disable-line react-hooks/exhaustive-deps

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

          // remove any unmarked dates
          if (!updated[date].marked && date !== today) {
            delete updated[date];
          }
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
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  return { markedDates };
}
