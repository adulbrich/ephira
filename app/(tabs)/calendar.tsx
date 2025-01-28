import { useEffect } from "react";
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
import DayView from "@/components/dayView/DayView";
import { getDay, getDrizzleDatabase } from "@/db/database";
import type { DayData } from "@/constants/Interfaces";
import { useTheme, Divider } from "react-native-paper";
import { FlowColors } from "@/constants/Colors";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import * as schema from "@/db/schema";

import { useSelectedDate, useMarkedDates } from "@/assets/src/calendar-storage";

export default function FlowCalendar() {
  // access state management
  const { date, setDate, setFlow, setId } = useSelectedDate();
  const storedDatesState = useMarkedDates();

  // can also be used like this
  // const selectedDate = useSelectedDate().date

  const theme = useTheme();

  // get date in local time
  const day = new Date();
  const offset = day.getTimezoneOffset();
  const localDate = new Date(day.getTime() - offset * 60 * 1000);
  const today = localDate.toISOString().split("T")[0];

  const db = getDrizzleDatabase();
  const { data } = useLiveQuery(db.select().from(schema.days));

  // useLiveQuery will automatically update the calendar when the db data changes
  useEffect(() => {
    function refreshCalendar(allDays: DayData[]) {
      if (allDays.length !== 0) {
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
        setDate(today);
      } else {
        Object.keys(storedDatesState).forEach((date) => {
          // if no dates are stored, iterate through and remove set all stored dates as "marked: false"
          storedDatesState[date] = {
            ...storedDatesState[date],
            marked: false,
          };
        });
        setDate(today);
      }
    }
    refreshCalendar(data as DayData[]);
  }, [data, today]); // eslint-disable-line react-hooks/exhaustive-deps

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

    async function fetchData() {
      const day = await getDay(date);

      //set other values of selecteDateState (if they exist)
      setFlow(day?.flow_intensity ? day.flow_intensity : 0);
      setId(day?.id ? day.id : 0);

      // reset old selected date
      Object.keys(storedDatesState).forEach((date) => {
        // iterate through all stored dates, set selected = false
        storedDatesState[date] = {
          ...storedDatesState[date],
          selected: false,
        };

        // if an item isn't marked and isn't the selected date, remove it from the stored dates
        if (!storedDatesState[date].marked) {
          if (date !== date) {
            delete storedDatesState[date];
          }
        }
      });

      // set new selected date
      storedDatesState[date] = {
        ...storedDatesState[date],
        selected: true,
      };

      return;
    }

    fetchData();
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };
  
  const themeKey = theme.dark ? "dark-theme" : "light-theme";

  return (
    <SafeAreaProvider>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <KeyboardAvoidingView style={{ flex: 1 }}>
          <SafeAreaView style={styles.container}>
            <View
              key={themeKey}
              style={{ backgroundColor: theme.colors.background, padding: 4 }}
            >
              <Calendar
                maxDate={today}
                markedDates={{ ...storedDatesState }}
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
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                backgroundColor: theme.colors.background,
              }}
              automaticallyAdjustKeyboardInsets={true}
            >
              <View
                style={{ backgroundColor: theme.colors.background, padding: 4 }}
              >
                <Calendar
                  maxDate={today}
                  markedDates={{ ...storedDatesState }}
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
              <View>{date && <DayView />}</View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaProvider>
  );
}
