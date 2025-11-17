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
import DayView from "@/components/dayView/DayView";
import { useTheme, MD3Theme, Divider, Text } from "react-native-paper";
import {
  useSelectedDate,
  useCalendarFilters,
  useThemeColor,
  usePredictionChoice,
} from "@/assets/src/calendar-storage";
import { getSetting, insertSetting } from "@/db/database";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import { useMarkedDates } from "@/hooks/useMarkedDates";
import { FilterColorsDark, FilterColorsLight } from "@/constants/Colors";
import { Image } from "react-native";
import FadeInView from "@/components/animations/FadeInView";
import { useFocusEffect } from "expo-router";

export default function FlowCalendar() {
  const [key, setKey] = useState<string>("");

  const { date, setDate } = useSelectedDate();
  const { selectedFilters, setSelectedFilters } = useCalendarFilters();
  const { setPredictionChoice } = usePredictionChoice();

  const { loading, markedDates } = useMarkedDates(selectedFilters);
  const theme = useTheme();
  const filterColors = theme.dark ? FilterColorsDark : FilterColorsLight;
  const styles = makeStyles({ theme });

  const day = new Date();
  const offset = day.getTimezoneOffset();
  const localDate = new Date(day.getTime() - offset * 60000);
  const today = localDate.toISOString().split("T")[0];

  const dismissKeyboard = () => Keyboard.dismiss();

  const { themeColor } = useThemeColor();
  const themeKey = `${theme.dark ? "dark" : "light"}-${themeColor}`;

  useEffect(() => {
    const loadFilters = async () => {
      const filters = await getSetting(SettingsKeys.calendarFilters);
      if (filters?.value) {
        setSelectedFilters(JSON.parse(filters.value));
      } else {
        setSelectedFilters(["Flow"]);
        await insertSetting(
          SettingsKeys.calendarFilters,
          JSON.stringify(["Flow"]),
        );
      }
    };
    loadFilters();
  }, [setSelectedFilters]);

  useEffect(() => {
    const loadPredictionChoice = async () => {
      const filters = await getSetting(SettingsKeys.cyclePredictions);
      if (filters?.value) {
        setPredictionChoice(JSON.parse(filters.value));
      } else {
        setPredictionChoice(true);
        await insertSetting(
          SettingsKeys.cyclePredictions,
          JSON.stringify(true),
        );
      }
    };
    loadPredictionChoice();
  }, [setPredictionChoice]);

  useFocusEffect(
    useCallback(() => {
      setDate(today);
    }, [setDate, today]),
  );

  const jumpToToday = () => {
    setDate(today);
    setKey(date + String(Math.random()));
  };

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
                    allowSelectionOutOfRange={false}
                    key={key}
                    renderHeader={(date: object) => (
                      <CalendarHeader onJumpToToday={jumpToToday} date={date} />
                    )}
                    maxDate={today}
                    markingType="multi-period"
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
                        key={filter}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: 4,
                        }}
                      >
                        {filter === "Flow" ? (
                          <Image
                            source={require("@/assets/images/flow_gradient_circle.png")}
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 8,
                              marginRight: 8,
                            }}
                          />
                        ) : (
                          <View
                            style={{
                              width: 16,
                              height: 16,
                              backgroundColor: filterColors[index],
                              borderRadius: 8,
                              marginRight: 8,
                            }}
                          />
                        )}
                        <Text>{filter}</Text>
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
