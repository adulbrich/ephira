import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import DayView from "@/components/DayView";
import { getDay, getDrizzleDatabase } from "@/db/database";
import type { DayData, MarkedDates } from "@/constants/Interfaces";
import { useTheme, Divider } from "react-native-paper";
import { FlowColors } from "@/constants/Colors";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import * as schema from "@/db/schema";

import { useSelectedDate } from "@/assets/src/date-storage";

export default function FlowCalendar() {
  const {setData, setDate, id, date, flow_intensity} = useSelectedDate();

  const theme = useTheme();
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
  };
  const [todayData, setTodayData] = useState<DayData | null>(null);
  const [markedDatesObj, setMarkedDates] = useState<any>({});
  const db = getDrizzleDatabase();
  const { data } = useLiveQuery(db.select().from(schema.days));

  // useLiveQuery will automatically update the calendar when the db data changes
  useEffect(() => {
    function refreshCalendar(allDays: DayData[]) {
      const newMarkedDates: MarkedDates = {};
      if (allDays) {
        allDays.forEach((day: any) => {
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
    }

    refreshCalendar(data as DayData[]);
  }, [data, today]);

  // Since iOS bar uses absolute positon for blur affect, we have to adjust padding to bottom of container
  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
      paddingTop: StatusBar.currentHeight,
      paddingBottom: Platform.select({
        ios: 70,
        default: 0,
      }),
    },
  });

  // get data for selected date on calendar (when user presses a different day)
  useEffect(() => {
    if (!date) return;

    async function fetchData(selectedDate: string) {
      const day = await getDay(selectedDate);

      setMarkedDates((prevMarkedDates: MarkedDates) => {
        const newMarkedDates = { ...prevMarkedDates };

        // reset old selected date
        Object.keys(newMarkedDates).forEach((date) => {
          newMarkedDates[date] = {
            ...newMarkedDates[date],
            selected: false,
          };
        });

        // set new selected date
        newMarkedDates[selectedDate] = {
          ...newMarkedDates[selectedDate],
          selected: true,
        };

        return newMarkedDates;
      });

      setTodayData(day ? (day as DayData) : null);
    }

    fetchData(date);
  }, [date]);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <SafeAreaProvider>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <SafeAreaView style={styles.container}>
            <View
              style={{ backgroundColor: theme.colors.background, padding: 4 }}
            >
              <Calendar
                key={markedDatesObj}
                maxDate={today}
                markedDates={markedDatesObj}
                enableSwipeMonths={true}
                onDayPress={(day: { dateString: string }) =>
                  setDate(day.dateString)
                }
                theme={{
                  calendarBackground: theme.colors.background,
                  textSectionTitleColor: theme.colors.secondary,
                  selectedDayBackgroundColor: theme.colors.primary,
                  selectedDayTextColor: theme.colors.onPrimary,
                  todayTextColor: theme.colors.primary,
                  dayTextColor: theme.colors.onBackground,
                  textDisabledColor: theme.colors.surfaceVariant,
                  arrowColor: theme.colors.primary,
                  monthTextColor: theme.colors.primary,
                  textDayFontFamily: "monospace",
                  textMonthFontFamily: "monospace",
                  textDayHeaderFontFamily: "monospace",
                  textDayFontSize: 16,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 16,
                }}
              />
              <Divider />
            </View>
            <ScrollView>
              <View>
                {date && (
                  <DayView
                    date={date}
                    dateFlow={
                      todayData?.flow_intensity ? todayData.flow_intensity : 0
                    }
                  />
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaProvider>
  );
}
