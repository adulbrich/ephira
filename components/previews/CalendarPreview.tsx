import React, { useCallback, useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { Divider, Text, useTheme } from "react-native-paper";
import {
  useSelectedDate,
  useCalendarFilters,
  useThemeColor,
  usePredictionChoice,
} from "@/assets/src/calendar-storage";
import { useMarkedDates } from "@/hooks/useMarkedDates";
import { FilterColorsDark, FilterColorsLight } from "@/constants/Colors";
import CalendarHeader from "@/components/calendar/CalendarHeader";

export default function CalendarPreview() {
  const theme = useTheme();
  const filterColors = theme.dark ? FilterColorsDark : FilterColorsLight;

  const [key, setKey] = useState<string>("");

  const { date, setDate } = useSelectedDate();
  const { selectedFilters } = useCalendarFilters();
  const { predictionChoice } = usePredictionChoice();

  const { loading, markedDates } = useMarkedDates(selectedFilters);

  // local “today” calculation (same logic, but contained)
  const today = useMemo(() => {
    const day = new Date();
    const offset = day.getTimezoneOffset();
    const localDate = new Date(day.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  }, []);

  const { themeColor } = useThemeColor();
  const themeKey = `${theme.dark ? "dark" : "light"}-${themeColor}`;

  const jumpToToday = useCallback(() => {
    setDate(today);
    // force re-render so Calendar snaps back
    setKey(today + String(Math.random()));
  }, [setDate, today]);

  return (
    <View style={[styles.root]} key={themeKey}>
      <Calendar
        allowSelectionOutOfRange={false}
        key={key}
        renderHeader={(d: object) => (
          <CalendarHeader onJumpToToday={jumpToToday} date={d} />
        )}
        maxDate={today}
        markingType="multi-period"
        markedDates={{
          ...markedDates,
          [date || today]: {
            ...(markedDates?.[date || today] ?? {}),
            selected: true,
            selectedColor: theme.colors.primary,
            selectedTextColor: theme.colors.onPrimary,
          },
        }}
        enableSwipeMonths={true}
        onDayPress={(day: { dateString: string }) => setDate(day.dateString)}
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
          textDayFontSize: 14,
          textDayHeaderFontSize: 14,
        }}
      />

      <Divider style={{ marginTop: 6 }} />

      <View style={styles.legendContainer}>
        {selectedFilters.map((filter, index) => (
          <View key={filter} style={styles.legendItem}>
            {filter === "Flow" ? (
              <Image
                source={require("@/assets/images/flow_gradient_circle.png")}
                style={styles.flowDot}
              />
            ) : (
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: filterColors[index] },
                ]}
              />
            )}
            <Text variant="bodySmall" style={{ color: theme.colors.onBackground }}>
              {filter}
            </Text>
          </View>
        ))}
      </View>

      {selectedFilters.includes("Cycle Prediction") && predictionChoice && (
        <View
          style={[
            styles.predictionNote,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, fontStyle: "italic" }}
          >
             Predicted cycles are estimates
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  legendContainer: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-around",
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    marginRight: 6,
  },
  flowDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    marginRight: 6,
  },
  predictionNote: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: "center",
  },
});