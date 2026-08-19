import { View, StyleSheet } from "react-native";
import { Card, Text, useTheme, type MD3Theme } from "react-native-paper";
import type { PredictedDate } from "@/constants/Interfaces";
import { addDays, formatAsISODate, startOfLocalDay } from "@/utils/dates";

/**
 * The seven days the strip shows, starting at `from`.
 *
 * Dated with `formatAsISODate`, which reads the local calendar day. This used
 * `toISOString`, which is UTC: east of UTC every date in the strip was
 * labelled a day early, so the "today" marker sat on the wrong column and
 * each column matched a prediction belonging to the day before it.
 *
 * `from` is a parameter rather than a clock read, which is what lets this be
 * tested in both directions without pinning a timezone.
 */
export function upcomingWeek(from: Date) {
  const start = startOfLocalDay(from);

  return Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(start, offset);
    return {
      dateStr: formatAsISODate(date),
      dayNum: date.getDate(),
      weekday: date.toLocaleDateString("en-US", { weekday: "short" }).charAt(0),
    };
  });
}

interface PredictionCardProps {
  daysUntilNextPeriod: number;
  nextPredictedStart: string | null;
  predictedDates: PredictedDate[];
  confidence: number;
}

function MiniCalendar({
  predictedDates,
  theme,
}: {
  predictedDates: PredictedDate[];
  theme: MD3Theme;
}) {
  const days = upcomingWeek(new Date());
  const todayStr = days[0].dateStr;

  const predictedSet = new Set(predictedDates.map((p) => p.date));

  return (
    <View style={styles.miniCalendar}>
      {days.map(({ dateStr, dayNum, weekday }) => {
        const isPredicted = predictedSet.has(dateStr);
        const isToday = dateStr === todayStr;

        return (
          <View
            key={dateStr}
            style={[
              styles.calendarDay,
              isPredicted && {
                backgroundColor: theme.colors.errorContainer,
              },
              isToday && {
                borderWidth: 2,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <Text
              variant="labelSmall"
              style={[
                styles.weekdayText,
                { color: theme.colors.onSurfaceVariant },
                isPredicted && { color: theme.colors.onErrorContainer },
              ]}
            >
              {weekday}
            </Text>
            <Text
              variant="bodyLarge"
              style={[
                styles.dayNumber,
                { color: theme.colors.onSurface },
                isToday && { fontWeight: "bold" },
                isPredicted && { color: theme.colors.onErrorContainer },
              ]}
            >
              {dayNum}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function PredictionCard({
  daysUntilNextPeriod,
  nextPredictedStart,
  predictedDates,
  confidence,
}: PredictionCardProps) {
  const theme = useTheme();

  const formattedDate = nextPredictedStart
    ? new Date(`${nextPredictedStart}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Unknown";

  const confidenceLabel =
    confidence >= 80 ? "High" : confidence >= 50 ? "Medium" : "Low";

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            Next Period
          </Text>
          <View
            style={[
              styles.confidenceBadge,
              { backgroundColor: theme.colors.secondaryContainer },
            ]}
          >
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSecondaryContainer }}
            >
              {confidenceLabel} confidence
            </Text>
          </View>
        </View>

        <View style={styles.countdownRow}>
          <Text
            variant="displaySmall"
            style={[styles.countdown, { color: theme.colors.primary }]}
          >
            {daysUntilNextPeriod}
          </Text>
          <View style={styles.countdownLabel}>
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              days
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              until {formattedDate}
            </Text>
          </View>
        </View>

        <MiniCalendar predictedDates={predictedDates} theme={theme} />
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  countdown: {
    fontWeight: "bold",
    marginRight: 12,
  },
  countdownLabel: {
    justifyContent: "center",
  },
  miniCalendar: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  calendarDay: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    minWidth: 36,
  },
  weekdayText: {
    fontSize: 10,
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 16,
  },
});
