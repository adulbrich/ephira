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
import type { MarkedDates } from "@/constants/Interfaces";
import { useTheme, Divider } from "react-native-paper";
import { FlowColors } from "@/constants/Colors";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import * as schema from "@/db/schema";

import { useSelectedDate, useMarkedDates, DayData } from "@/assets/src/date-storage";

export default function FlowCalendar() {
  const markedDatesState = useMarkedDates();

  const selectedDateState = useSelectedDate();

  const theme = useTheme();

  const day = new Date()
  
  const offset = day.getTimezoneOffset()

  const localDate = new Date(day.getTime() - offset * 60 * 1000)

  const today = localDate.toISOString().split("T")[0]

  const db = getDrizzleDatabase();
  const { data } = useLiveQuery(db.select().from(schema.days));
  console.log("data1", data)

  // useLiveQuery will automatically update the calendar when the db data changes
  useEffect(() => {
    function refreshCalendar(allDays: DayData[]) {
      
      if (allDays) {
        console.log("allDays1", allDays)
        allDays.forEach((day: any) => {
          markedDatesState[day.date] = {
            marked: true,
            dotColor:
              day.flow_intensity > 0
                ? FlowColors[day.flow_intensity]
                : "transparent",
            selected: day.date === today,
          };
        });
        selectedDateState.setDate(today);
        console.log("markedDatesState1", markedDatesState)
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
    if (!selectedDateState.date) return;

    async function fetchData() { 
      const day = await getDay(selectedDateState.date);
      console.log("markedDatesState2", markedDatesState)
        // reset old selected date
        Object.keys(markedDatesState).forEach((date) => {
          markedDatesState[date] = {
            ...markedDatesState[date],
            selected: false,
          };
        });

        // set new selected date
        markedDatesState[selectedDateState.date] = {
          ...markedDatesState[selectedDateState.date],
          selected: true,
        };
        
      console.log("markedDatesState3", markedDatesState)

      selectedDateState.setData(day as DayData);
    }

    fetchData();
  }, [selectedDateState.date]);

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
                maxDate={today}
                markedDates={markedDatesState}
                enableSwipeMonths={true}
                onDayPress={(day: { dateString: string }) =>
                  selectedDateState.setDate(day.dateString)
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
                {selectedDateState.date && (
                  <DayView
                    date={selectedDateState.date}
                    dateFlow={
                      selectedDateState.flow_intensity ? selectedDateState.flow_intensity : 0
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
