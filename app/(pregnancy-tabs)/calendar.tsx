import { useCallback, useEffect, useState } from "react";
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
import { useTheme, MD3Theme, Divider, Text } from "react-native-paper";
import { useThemeColor } from "@/assets/src/calendar-storage";
import {
  usePregnancySelectedDate,
  usePregnancyCalendarFilters,
} from "@/assets/src/pregnancy-storage";
import { getSetting, insertSetting } from "@/db/database";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import CustomDay from "@/components/calendar/CustomDay";
import { usePregnancyMarkedDates } from "@/hooks/usePregnancyMarkedDates";
import { AppointmentColor, SpecialtyFilterColor } from "@/constants/Colors";
import FadeInView from "@/components/animations/FadeInView";
import { useFocusEffect } from "expo-router";
import PregnancyDayView from "@/components/pregnancyDayView/PregnancyDayView";

const DEFAULT_FILTERS = ["Appointments", "Symptoms"];

export default function PregnancyCalendar() {
  const [key, setKey] = useState<string>("");

  const { date, setDate } = usePregnancySelectedDate();
  const { selectedFilters, setSelectedFilters } = usePregnancyCalendarFilters();

  const { markedDates } = usePregnancyMarkedDates(selectedFilters);
  const theme = useTheme();
  const styles = makeStyles({ theme });

  const day = new Date();
  const offset = day.getTimezoneOffset();
  const localDate = new Date(day.getTime() - offset * 60 * 1000);
  const today = localDate.toISOString().split("T")[0];

  const { themeColor } = useThemeColor();
  const themeKey = `${theme.dark ? "dark" : "light"}-${themeColor}`;

  useEffect(() => {
    const loadFilters = async () => {
      const stored = await getSetting(SettingsKeys.pregnancyCalendarFilters);
      if (stored?.value) {
        setSelectedFilters(JSON.parse(stored.value));
      } else {
        setSelectedFilters(DEFAULT_FILTERS);
        await insertSetting(
          SettingsKeys.pregnancyCalendarFilters,
          JSON.stringify(DEFAULT_FILTERS),
        );
      }
    };
    loadFilters();
  }, [setSelectedFilters]);

  useFocusEffect(
    useCallback(() => {
      setDate(today);
    }, [setDate, today]),
  );

  const jumpToToday = () => {
    setDate(today);
    setKey(date + String(Math.random()));
  };

  const dismissKeyboard = () => Keyboard.dismiss();

  return (
    <FadeInView duration={200} backgroundColor={theme.colors.background}>
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
                  style={{
                    backgroundColor: theme.colors.background,
                    padding: 4,
                  }}
                >
                  <Calendar
                    key={key}
                    renderHeader={(date: object) => (
                      <CalendarHeader onJumpToToday={jumpToToday} date={date} />
                    )}
                    dayComponent={CustomDay as React.ComponentType<unknown>}
                    markedDates={{
                      ...markedDates,
                      [date]: {
                        ...(markedDates?.[date] ?? {}),
                        selected: true,
                        selectedColor: theme.colors.primary,
                        selectedTextColor: theme.colors.onPrimary,
                      },
                    }}
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
                  <View style={styles.legendContainer}>
                    {selectedFilters.map((filter) => (
                      <View
                        key={filter}
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
                              filter === "Appointments"
                                ? AppointmentColor
                                : SpecialtyFilterColor,
                            borderRadius: 8,
                            marginRight: 8,
                          }}
                        />
                        <Text>{filter}</Text>
                      </View>
                    ))}
                  </View>
                  <Divider />
                </View>
                <View>{date && <PregnancyDayView />}</View>
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaProvider>
    </FadeInView>
  );
}

const makeStyles = ({ theme }: { theme: MD3Theme }) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
      paddingTop: StatusBar.currentHeight,
      paddingBottom: Platform.select({
        ios: 60,
        default: 0,
      }),
    },
    legendContainer: {
      padding: 8,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-around",
    },
  });
