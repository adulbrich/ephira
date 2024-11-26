import { Text } from "react-native-paper"
import { ThemedView } from "@/components/ThemedView"

export default function Settings() {
  return (
    <ThemedView style={{ height: "100%", padding: 10 }}>
      <Text variant="titleLarge" style={{ textAlign: "center" }}>
        Settings will go in here
      </Text>
    </ThemedView>
  )
}
