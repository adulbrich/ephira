import { useState } from "react"
import { StyleSheet, View } from "react-native"
import { ThemedView } from "@/components/ThemedView"
import { getAllDays, deleteAllDays } from "@/db/database"
import { Button, Text } from "react-native-paper"
const flows = ["None", "Spotting", "Light", "Medium", "Heavy"]

export default function HomeScreen() {
  const [showData, setShowData] = useState(false)
  const [data, setData] = useState<any>(null)

  function refreshData() {
    setShowData(true)
    getAllDays().then((result) => {
      setData(result)
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
        {showData ? (
          data && data.length > 0 ? (
            data.map((day: any) => (
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
  )
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
})
