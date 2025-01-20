
import { StyleSheet, View } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { getAllDays, deleteAllDays } from "@/db/database";
import { Button, Text } from "react-native-paper";
import { useData} from "@/assets/src/calendar-storage";
import { DayData } from "@/constants/Interfaces";
const flows = ["None", "Spotting", "Light", "Medium", "Heavy"];

export default function HomeScreen() {
  const useDataState = useData();
  

  function refreshData() {
    useDataState.setShow(true);
    getAllDays().then((result)=>{
      useDataState.setData(result as DayData[])
    })
  }

  return (
    <ThemedView style={styles.viewContainer}>
      <Text variant="displaySmall" style={{ textAlign: "center" }}>
        Calendar/DB Testing
      </Text>
      <Button mode="elevated" onPress={refreshData}>
        View/Refresh DB Data
      </Button>
      <Button
        mode="elevated"
        onPress={() => deleteAllDays().then(() => refreshData())}
      >
        Delete DB Data
      </Button>
      <View style={styles.stepContainer}>
        {useDataState.show ? (
          useDataState.data && useDataState.data.length > 0 ? (
            useDataState.data.map((day: any) => (
              <Text variant="bodyMedium" key={day.id}>
                {day.date}: {flows[day.flow_intensity]}
              </Text>
            ))
          ) : (
            <Text>No data in database</Text>
          )
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  viewContainer: {
    height: "100%",
    padding: 4,
    display: "flex",
    gap: 10,
  },
});
