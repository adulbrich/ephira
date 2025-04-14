import { StyleSheet, View } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import FlowChart from "@/components/FlowChart";
import { FlowColors } from "@/constants/Colors";
import { useData, usePillBtn } from "@/assets/src/calendar-storage";
import { useTheme, Text, Button } from "react-native-paper";
import FadeInView from "@/components/animations/FadeInView";
import { useCallback } from "react";
import { getAllDays, getAllMedicationEntries, getDay, getDayById, getMedication } from "@/db/database";
import { MedEntries } from "@/constants/Interfaces";
import { isDate } from "util/types";

export default function HomeScreen() {
  const newday = new Date();
  const offset = newday.getTimezoneOffset();
  const localDate = new Date(newday.getTime() - offset * 60 * 1000);
  const today = localDate.toISOString().split("T")[0];

  const pillBtnShow = false;
  const theme = useTheme();
  const { data: flowData } = useData();
  const { data: pillData, show: showPillBtn, setShow, setPillEntries} = usePillBtn();


  const fetchAllMedicationEntries = useCallback(async () => {
    const allMeds = await getAllMedicationEntries();
    const PillID = await getMedication("Pill");
    const days = await getAllDays();

    if(PillID){
      const recentPillLogs = allMeds
      .filter((entry) => entry.medication_id == PillID.id)
      .sort((a, b) => a.id.valueOf() - b.id.valueOf())

      console.log(allMeds)
      console.log("-----------------------------------")
    
      if(recentPillLogs){
        setPillEntries(recentPillLogs as MedEntries[]);

        recentPillLogs.forEach(async (entry, index) => {
          const day = await getDayById(entry.day_id)
          if(day){
            const date = new Date(day.date)
            console.log("date from db", date)
            const todayDate = new Date(today)
            
            const bounds = new Date(todayDate.setDate(todayDate.getDate() - 7));
            console.log("bounds", bounds)
            if(date.toISOString().split("T")[0] == today){
              console.log("TODAY!!!!!!!!!!!!!!1", date)
              setShow(true);
              return;
            }

            if(date < bounds){
              console.log("not in range :/: ", date)
            }
            else{
              console.log("FOUND ONE BITCHHHHH", date)
              setShow(false);
              return;
            }
          }
        });   

        console.log("recentPillLogs", recentPillLogs)
        console.log("pillData inside fetch", pillData)
      }
    }
  },[])

  function onSave(){
    fetchAllMedicationEntries();
    console.log("pillData inside save", pillData)
  }


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
          <Button
          mode="elevated"
          buttonColor={theme.colors.primaryContainer}
          textColor={theme.colors.onPrimaryContainer}
          onPress={() => onSave()}
          disabled={pillBtnShow}
          >
            Tap Here to View your Daily Tasks
          </Button>

          <FlowChart />
          <Text
            style={{
              color: theme.colors.secondary,
              fontSize: 24,
              fontWeight: "bold",
              paddingVertical: 16,
              textAlign: "center"
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

                  return (
                    <View
                      key={index}
                      style={[
                        styles.flowLogItem,
                        { backgroundColor: FlowColors[day.flow_intensity] },
                      ]}
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
