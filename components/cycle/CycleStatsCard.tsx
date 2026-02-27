import { View, StyleSheet } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";
import { CycleStats } from "@/constants/Interfaces";

interface CycleStatsCardProps {
  stats: CycleStats;
}

interface StatRowProps {
  label: string;
  value: string;
  subtext?: string;
}

function StatRow({ label, value, subtext }: StatRowProps) {
  const theme = useTheme();

  return (
    <View style={styles.statRow}>
      <Text
        variant="bodyMedium"
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        {label}
      </Text>
      <View style={styles.valueContainer}>
        <Text
          variant="titleMedium"
          style={[styles.value, { color: theme.colors.onSurface }]}
        >
          {value}
        </Text>
        {subtext && (
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {subtext}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function CycleStatsCard({ stats }: CycleStatsCardProps) {
  const theme = useTheme();

  const regularityLabel = stats.isRegular ? "Regular" : "Irregular";
  const regularityColor = stats.isRegular
    ? theme.colors.primary
    : theme.colors.error;

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.content}>
        <Text
          variant="titleMedium"
          style={[styles.title, { color: theme.colors.onSurface }]}
        >
          Cycle Statistics
        </Text>

        <StatRow
          label="Average cycle length"
          value={`${stats.averageCycleLength} days`}
        />

        <View style={styles.divider} />

        <StatRow
          label="Cycle variation"
          value={`\u00B1${stats.cycleVariation} days`}
          subtext={regularityLabel}
        />

        <View style={styles.divider} />

        <StatRow
          label="Cycles tracked"
          value={stats.totalCyclesTracked.toString()}
        />

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Prediction accuracy
          </Text>
          <View style={styles.accuracyContainer}>
            <Text
              variant="titleMedium"
              style={[styles.value, { color: theme.colors.onSurface }]}
            >
              {stats.predictionAccuracy}%
            </Text>
            <View
              style={[
                styles.accuracyBar,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <View
                style={[
                  styles.accuracyFill,
                  {
                    width: `${stats.predictionAccuracy}%`,
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        <View
          style={[
            styles.regularityBadge,
            { backgroundColor: regularityColor + "20" },
          ]}
        >
          <View
            style={[styles.regularityDot, { backgroundColor: regularityColor }]}
          />
          <Text variant="labelMedium" style={{ color: regularityColor }}>
            {stats.isRegular
              ? "Your cycle is regular"
              : "Your cycle varies more than average"}
          </Text>
        </View>
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
  title: {
    fontWeight: "600",
    marginBottom: 16,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  valueContainer: {
    alignItems: "flex-end",
  },
  value: {
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
  },
  accuracyContainer: {
    alignItems: "flex-end",
    gap: 4,
  },
  accuracyBar: {
    width: 80,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  accuracyFill: {
    height: "100%",
    borderRadius: 2,
  },
  regularityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
  },
  regularityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
});
