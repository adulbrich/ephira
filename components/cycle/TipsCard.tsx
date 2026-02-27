import { View, StyleSheet } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";

interface TipsCardProps {
  tips: string[];
  phaseName: string;
  phaseColor: string;
}

export default function TipsCard({
  tips,
  phaseName,
  phaseColor,
}: TipsCardProps) {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.accentBar, { backgroundColor: phaseColor }]} />
          <Text
            variant="titleMedium"
            style={[styles.title, { color: theme.colors.onSurface }]}
          >
            Tips for {phaseName} Phase
          </Text>
        </View>

        <View style={styles.tipsContainer}>
          {tips.map((tip, index) => (
            <View key={index} style={styles.tipRow}>
              <View
                style={[
                  styles.tipNumber,
                  { backgroundColor: phaseColor + "20" },
                ]}
              >
                <Text
                  variant="labelMedium"
                  style={{ color: phaseColor, fontWeight: "600" }}
                >
                  {index + 1}
                </Text>
              </View>
              <Text
                variant="bodyMedium"
                style={[
                  styles.tipText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {tip}
              </Text>
            </View>
          ))}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  accentBar: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 12,
  },
  title: {
    fontWeight: "600",
  },
  tipsContainer: {
    gap: 12,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    lineHeight: 22,
  },
});
