import { StyleSheet, View } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import FlowChart from "@/components/FlowChart";
import { FlowColors } from "@/constants/Colors";
import { useData } from "@/assets/src/calendar-storage";
import { useTheme, Text } from "react-native-paper";

export default function HomeScreen() {
  const theme = useTheme();
  const { data: flowData } = useData();

  // Get up to 5 most recent logged days
  const recentFlowDays = [...flowData]
    .filter((day) => day.flow_intensity !== undefined)
    .sort((a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf())
    .slice(0, 5);

  return (
    <ThemedView style={styles.viewContainer}>
      <View
        style={{ flex: 1, justifyContent: "center", alignContent: "center" }}
      >
        <FlowChart />
        <View style={styles.flowLogContainer}>
        <Text
              style={{
                color: theme.colors.secondary,
                fontSize: 24,
                fontWeight: "bold",
                paddingBottom: 16,
                textAlign: "center",
              }}
            >
              Your Most Recent Flow Dates This Month
        </Text>
        {recentFlowDays.length > 0 ? (
          <>
            {recentFlowDays.map((day, index) => {
              const localDate = new Date(day.date + "T00:00:00");
              const formattedDate = localDate.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              return (
                <View
                  key={index}
                  style={[
                    styles.flowLogItem,
                    { backgroundColor: FlowColors[day.flow_intensity] },
                  ]}
                >
                  <Text style={styles.flowLogText}>{formattedDate}</Text>
                </View>
              );
            })}
          </>
        ) : (
          <View
            style={[
              styles.flowLogItem,
              { backgroundColor: theme.colors.secondary, width:"90%" }
            ]}
          >
                  <Text style={[styles.flowLogText, {fontSize: 16, color: theme.colors.onSecondary}]}>No Flow Dates Logged This Month!</Text>
                </View>
          )}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  viewContainer: {
    height: "100%",
    padding: 4,
    display: "flex",
    gap: 10,
  },
  flowLogContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
    padding: 10,
  },
  flowLogItem: {
    width: "15%",
    height: "40%",
    padding: 10,
    margin: 4,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  flowLogText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
});
