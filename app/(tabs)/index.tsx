import { StyleSheet, View, Pressable } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import FlowChart from "@/components/FlowChart";
import { FlowColors } from "@/constants/Colors";
import {
  useData,
  useDatabaseChangeNotifier,
  usePredictedCycle,
} from "@/assets/src/calendar-storage";
import { getFlowTypeString } from "@/constants/Flow";
import { useTheme, Text, Button } from "react-native-paper";
import FadeInView from "@/components/animations/FadeInView";
import { useState, useCallback, useEffect } from "react";
import {
  getLastUsedBirthControlName,
  quickLogBirthControlForToday,
} from "@/db/quickBirthControl";
import { useCyclePhase } from "@/hooks/useCyclePhase";
import { CYCLE_PHASES } from "@/constants/CyclePhases";
import { useRouter } from "expo-router";
import { useFetchCycleData } from "@/hooks/useFetchCycleData";

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: flowData } = useData();
  const [busy, setBusy] = useState(false);
  const { setDatabaseChange, databaseChange } = useDatabaseChangeNotifier();
  const { predictedCycle, setPredictedCycle } = usePredictedCycle();
  const { fetchCycleData } = useFetchCycleData(setPredictedCycle);
  const { cycleState } = useCyclePhase(flowData, predictedCycle);

  // Load cycle data on mount and when database changes
  useEffect(() => {
    fetchCycleData();
  }, [databaseChange, fetchCycleData]);

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

  // Get current phase name
  const currentPhase = cycleState
    ? CYCLE_PHASES[cycleState.currentPhase]
    : null;
  const phaseName = currentPhase ? currentPhase.name : null;

  const handlePhasePress = useCallback(() => {
    try {
      router.push("/(tabs)/cycle");
    } catch (error) {
      console.error("Navigation error:", error);
    }
  }, [router]);

  return (
    <FadeInView duration={200} backgroundColor={theme.colors.background}>
      <ThemedView style={styles.viewContainer}>
        <View
          style={{ flex: 1, justifyContent: "center", alignContent: "center" }}
        >
          {/* Current Phase Button */}
          {phaseName && (
            <Pressable
              onPress={handlePhasePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              pressRetentionOffset={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={({ pressed }) => [
                styles.phaseButton,
                {
                  backgroundColor: currentPhase?.color || theme.colors.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={styles.phaseButtonText}>
                You're in your {phaseName} phase
              </Text>
            </Pressable>
          )}
          <View style={styles.flowChartContainer}>
            <FlowChart />
          </View>
          <View style={{ alignItems: "center", marginTop: -16 }}>
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
  phaseButton: {
    marginHorizontal: 16,
    marginTop: 48,
    marginBottom: -16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10,
  },
  flowChartContainer: {
    marginTop: -16,
  },
  phaseButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
