import { View, StyleSheet } from "react-native";
import { Card, Text, useTheme, MD3Theme } from "react-native-paper";
import { PredictedDate } from "@/constants/Interfaces";

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
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Show next 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    return {
      dateStr: date.toISOString().split("T")[0],
      dayNum: date.getDate(),
      weekday: date.toLocaleDateString("en-US", { weekday: "short" }).charAt(0),
    };
  });

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
    ? new Date(nextPredictedStart + "T00:00:00").toLocaleDateString("en-US", {
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
