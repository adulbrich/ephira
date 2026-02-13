import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "react-native-paper";
import type { DateData } from "react-native-calendars";
import type { MarkedDate, periodData } from "@/constants/Interfaces";

type DayState = "selected" | "disabled" | "inactive" | "today" | "";

interface CustomDayProps {
  date?: DateData;
  state?: DayState;
  marking?: MarkedDate & {
    selected?: boolean;
    selectedColor?: string;
    selectedTextColor?: string;
  };
  onPress?: (date: DateData) => void;
  onLongPress?: (date: DateData) => void;
  // Allow additional props from react-native-calendars
  [key: string]: unknown;
}

export default function CustomDay({
  date,
  state,
  marking,
  onPress,
}: CustomDayProps) {
  const theme = useTheme();

  if (!date) return null;

  const isDisabled = state === "disabled" || state === "inactive";
  const isToday = state === "today";
  const isSelected = marking?.selected || state === "selected";
  const hasBirthControl = marking?.hasBirthControl;
  const hasIntercourse = marking?.hasIntercourse;
  const periods = marking?.periods ?? [];

  const handlePress = () => {
    if (!isDisabled && onPress) {
      onPress(date);
    }
  };

  const getTextColor = () => {
    if (isSelected) {
      return marking?.selectedTextColor ?? theme.colors.onPrimary;
    }
    if (isDisabled) {
      return theme.colors.surfaceVariant;
    }
    if (isToday) {
      return theme.colors.primary;
    }
    return theme.colors.onBackground;
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      style={styles.container}
      activeOpacity={0.6}
    >
      {/* Icons for birth control (star) and intercourse (heart) */}
      <View style={styles.iconContainer}>
        {hasBirthControl && (
          <Text style={[styles.icon, { color: theme.colors.primary }]}>★</Text>
        )}
        {hasIntercourse && (
          <Text style={[styles.icon, { color: theme.colors.error }]}>♥</Text>
        )}
      </View>

      {/* Date number */}
      <View
        style={[
          styles.dateContainer,
          isSelected && {
            backgroundColor: marking?.selectedColor ?? theme.colors.primary,
            borderRadius: 16,
          },
        ]}
      >
        <Text
          style={[
            styles.dateText,
            { color: getTextColor(), fontFamily: "monospace" },
          ]}
        >
          {date.day}
        </Text>
      </View>

      {/* Period markers */}
      <View style={styles.periodsContainer}>
        {periods.map((period: periodData, index: number) => (
          <View
            key={index}
            style={[
              styles.period,
              {
                backgroundColor: period.color,
                borderTopLeftRadius: period.startingDay ? 2 : 0,
                borderBottomLeftRadius: period.startingDay ? 2 : 0,
                borderTopRightRadius: period.endingDay ? 2 : 0,
                borderBottomRightRadius: period.endingDay ? 2 : 0,
              },
            ]}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: 44,
    minHeight: 50,
  },
  iconContainer: {
    height: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  icon: {
    fontSize: 10,
  },
  dateContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  dateText: {
    fontSize: 16,
    textAlign: "center",
  },
  periodsContainer: {
    flexDirection: "column",
    width: "100%",
    gap: 2,
    marginTop: 2,
  },
  period: {
    width: "100%",
    height: 4,
  },
});
