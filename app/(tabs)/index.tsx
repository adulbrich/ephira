import { StyleSheet, View } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import FlowChart from "@/components/FlowChart";
import { FlowColors } from "@/constants/Colors";
import {
  useData,
  useDatabaseChangeNotifier,
} from "@/assets/src/calendar-storage";
import { getFlowTypeString } from "@/constants/Flow";
import { useTheme, Text, Button } from "react-native-paper";
import FadeInView from "@/components/animations/FadeInView";
import { useState, useCallback } from "react";
import {
  getLastUsedBirthControlName,
  quickLogBirthControlForToday,
} from "@/db/quickBirthControl";

export default function HomeScreen() {
  const theme = useTheme();
  const { data: flowData } = useData();
  const [busy, setBusy] = useState(false);
  const { setDatabaseChange } = useDatabaseChangeNotifier();

  const onQuickBC = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const last = await getLastUsedBirthControlName();
      if (!last) {
        alert("No previous birth control found to quick-log.");
        setBusy(false);
        return;
      }
      await quickLogBirthControlForToday(last);
      // Trigger database change notification to refresh the calendar
      setDatabaseChange(Date.now().toString());
    } catch (e) {
      console.error("Quick BC Error:", e);
      alert(
        `Couldn't quick-log birth control: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setBusy(false);
    }
  }, [busy, setDatabaseChange]);

  // Get up to 5 most recent logged days
  const recentFlowDays = [...flowData]
    .filter((day) => day.flow_intensity !== undefined)
    .sort((a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf())
    .slice(0, 5);

  return (
    <FadeInView duration={200} backgroundColor={theme.colors.background}>
      <ThemedView style={styles.viewContainer}>
        <View
          style={{ flex: 1, justifyContent: "center", alignContent: "center" }}
        >
          <FlowChart />
          <View style={{ alignItems: "center", marginTop: 8 }}>
            <Button
              mode="contained"
              icon="pill"
              loading={busy}
              onPress={onQuickBC}
              style={{ width: 220 }}
            >
              Quick Birth Control
            </Button>
          </View>
          <Text
            style={{
              color: theme.colors.secondary,
              fontSize: 24,
              fontWeight: "bold",
              paddingVertical: 16,
              textAlign: "center",
            }}
          >
            Your Most Recent Flow Dates
          </Text>
          <View style={styles.flowLogContainer}>
            {recentFlowDays.length > 0 ? (
              <>
                {recentFlowDays.map((day, index) => {
                  const localDate = new Date(day.date + "T00:00:00");
                  const weekday = localDate.toLocaleDateString(undefined, {
                    weekday: "short",
                  });
                  const month = localDate.toLocaleDateString(undefined, {
                    month: "short",
                  });
                  const dayOfMonth = localDate.toLocaleDateString(undefined, {
                    day: "numeric",
                  });

                  const flowType = getFlowTypeString(day.flow_intensity ?? 0);
                  const backgroundColor = flowType
                    ? FlowColors[flowType]
                    : FlowColors.white;

                  return (
                    <View
                      key={index}
                      style={[styles.flowLogItem, { backgroundColor }]}
                    >
                      <Text style={styles.flowLogText}>{weekday}</Text>
                      <Text style={styles.flowLogText}>{month}</Text>
                      <Text style={styles.flowLogText}>{dayOfMonth}</Text>
                    </View>
                  );
                })}
              </>
            ) : (
              <View
                style={[
                  styles.flowLogItem,
                  { backgroundColor: theme.colors.secondary, width: "90%" },
                ]}
              >
                <Text
                  style={[
                    styles.flowLogText,
                    {
                      fontSize: 16,
                      color: theme.colors.onSecondary,
                    },
                  ]}
                >
                  No Flow Dates Logged!
                </Text>
              </View>
            )}
          </View>
        </View>
      </ThemedView>
    </FadeInView>
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
    padding: 4,
  },
  flowLogItem: {
    width: "16%",
    height: "40%",
    padding: 10,
    margin: 4,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  flowLogText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    textShadowColor: "black",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
});
