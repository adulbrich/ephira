
import { StyleSheet } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { Text } from "react-native-paper";

export default function HomeScreen() {
  return (
    <ThemedView style={styles.viewContainer}>
      <Text variant="displaySmall" style={{ textAlign: "center" }}>
        Home Page Coming Soon
      </Text>
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
});
