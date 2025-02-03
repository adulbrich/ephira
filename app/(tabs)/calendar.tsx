import { useState } from "react";
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
import { useTheme, MD3Theme, Divider } from "react-native-paper";
import { useSelectedDate } from "@/assets/src/calendar-storage";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import { useMarkedDates } from "@/hooks/useMarkedDates";

export default function FlowCalendar() {
  const { markedDates } = useMarkedDates();
  const [key, setKey] = useState<string>("");

  // access state management
  const { date, setDate } = useSelectedDate();

  // can also be used like this
  // const selectedDate = useSelectedDate().date

  const theme = useTheme();
  const styles = makeStyles({ theme });

  // get date in local time
  const day = new Date();
  const offset = day.getTimezoneOffset();
  const localDate = new Date(day.getTime() - offset * 60 * 1000);
  const today = localDate.toISOString().split("T")[0];

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const themeKey = theme.dark ? "dark-theme" : "light-theme";

  // the calendar doesn't expose a method to jump to today, so we have to
  // change the key after setting the date to force a re-render
  const jumpToToday = () => {
    setDate(today);
    setKey(themeKey + date + String(Math.random()));
  };

  return (
    <SafeAreaProvider>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <KeyboardAvoidingView style={{ flex: 1 }}>
          <SafeAreaView style={styles.container}>
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                backgroundColor: theme.colors.background,
              }}
              automaticallyAdjustKeyboardInsets={true}
            >
              <View
                key={themeKey}
                style={{ backgroundColor: theme.colors.background, padding: 4 }}
              >
                <Calendar
                  allowSelectionOutOfRange={false}
                  key={key}
                  renderHeader={(date: object) => (
                    <CalendarHeader onJumpToToday={jumpToToday} date={date} />
                  )}
                  maxDate={today}
                  markedDates={{ ...markedDates }}
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
                    textDayFontFamily: "monospace",
                    textDayHeaderFontFamily: "monospace",
                    textDayFontSize: 16,
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

const makeStyles = ({ theme }: { theme: MD3Theme }) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
      paddingTop: StatusBar.currentHeight,
      // Since iOS bar uses absolute positon for blur affect, we have to adjust padding to bottom of container
      paddingBottom: Platform.select({
        ios: 70,
        default: 0,
      }),
    },
  });
