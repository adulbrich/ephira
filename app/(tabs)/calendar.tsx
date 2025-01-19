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
import type { DayData } from "@/constants/Interfaces";
import { useTheme, Divider } from "react-native-paper";
import { FlowColors } from "@/constants/Colors";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import * as schema from "@/db/schema";

import { useSelectedDate, useMarkedDates} from "@/assets/src/date-storage";

export default function FlowCalendar() {
  const storedDatesState = useMarkedDates();
  const selectedDateState = useSelectedDate();

  const theme = useTheme();

  const day = new Date()
  const offset = day.getTimezoneOffset()
  const localDate = new Date(day.getTime() - offset * 60 * 1000)
  const today = localDate.toISOString().split("T")[0]

  const db = getDrizzleDatabase();
  const { data } = useLiveQuery(db.select().from(schema.days));

  // useLiveQuery will automatically update the calendar when the db data changes
  useEffect(() => {
    function refreshCalendar(allDays: DayData[]) {

      if (allDays) {
        allDays.forEach((day: any) => {
          storedDatesState[day.date] = {
            marked: true,
            dotColor:
              day.flow_intensity > 0
                ? FlowColors[day.flow_intensity]
                : "transparent",
            selected: day.date === today,
          };
        });
        selectedDateState.setDate(today)
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

      selectedDateState.setFlow((day?.flow_intensity ? day.flow_intensity : 0))
      selectedDateState.setId(day?.id ? day.id : 0)

        // reset old selected date
        Object.keys(storedDatesState).forEach((date) => {

          // iterate through all stored dates, set selected = false
          storedDatesState[date] = {
            ...storedDatesState[date],
            selected: false,
          };

          // if an item isn't marked and isn't the selected date, remove it from the stored dates
          if(!(storedDatesState[date].marked)){
            if(date != selectedDateState.date){
              delete storedDatesState[date]
            }
          }
          
        });

        // set new selected date
        storedDatesState[selectedDateState.date] = {
          ...storedDatesState[selectedDateState.date],
          selected: true,
        };
  
      //set other values of DayData, flow_intensity and id


      return
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
                markedDates={{...storedDatesState}}
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
                  <DayView/>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaProvider>
  );
}
