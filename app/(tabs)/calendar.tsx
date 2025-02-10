import { useEffect, useState } from "react";
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
import { SettingsKeys } from "@/constants/Settings";
import DayView from "@/components/dayView/DayView";
import { useTheme, MD3Theme, Divider, Text } from "react-native-paper";
import {
  useSelectedDate,
  useCalendarFilters,
} from "@/assets/src/calendar-storage";
import { getSetting, insertSetting } from "@/db/database";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import { useMarkedDates } from "@/hooks/useMarkedDates";
import { FilterColorsDark, FilterColorsLight } from "@/constants/Colors";

export default function FlowCalendar() {
  const [key, setKey] = useState<string>("");

  // access state management
  const { date, setDate } = useSelectedDate();
  const { selectedFilters, setSelectedFilters } = useCalendarFilters();
  // can also be used like this
  // const selectedDate = useSelectedDate().date

  const { loading, markedDates } = useMarkedDates(selectedFilters);
  const theme = useTheme();
  const filterColors = theme.dark ? FilterColorsDark : FilterColorsLight;
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

  // load filters from secure store
  useEffect(() => {
    const loadFilters = async () => {
      const filters = await getSetting(SettingsKeys.calendarFilters);
      if (filters?.value) {
        setSelectedFilters(JSON.parse(filters.value));
      } else {
        // set Flow as first filter by default (filler color given since color isn't optional)
        setSelectedFilters([{ label: "Flow", value: "flow" }]);
        await insertSetting(
          SettingsKeys.calendarFilters,
          JSON.stringify([{ label: "Flow", value: "flow" }]),
        );
      }
    };
    loadFilters();
  }, [setSelectedFilters]);

  // the calendar doesn't expose a method to jump to today, so we have to
  // change the key after setting the date to force a re-render
  const jumpToToday = () => {
    setDate(today);
    setKey(date + String(Math.random()));
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
                  markingType="multi-period"
                  markedDates={{ ...markedDates }}
                  enableSwipeMonths={true}
                  onDayPress={(day: { dateString: string }) =>
                    setDate(day.dateString)
                  }
                  displayLoadingIndicator={loading}
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
                <View style={styles.legendContainer}>
                  {selectedFilters.map((filter, index) => (
                    <View
                      key={filter.value}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 4,
                      }}
                    >
                      <View
                        style={{
                          width: 16,
                          height: 16,
                          backgroundColor:
                            filter.value === "flow"
                              ? "#ff7272"
                              : filterColors[index],
                          borderRadius: 8,
                          marginRight: 8,
                        }}
                      />
                      <Text>{filter.label}</Text>
                    </View>
                  ))}
                </View>
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
    legendContainer: {
      padding: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
    },
  });
