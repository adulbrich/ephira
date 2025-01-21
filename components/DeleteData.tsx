import { useState } from "react";
import { View, Alert } from "react-native";
import {
  ActivityIndicator,
  Button,
  Divider,
  List,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { deleteAllDataInDatabase } from "@/db/database";
import { ThemedView } from "@/components/ThemedView";

export default function DeleteData() {
  const theme = useTheme();
  const [inputValue, setInputValue] = useState("");
  const [buttonDisabled, setButtonDisabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleDeleteData = async () => {
    setLoading(true);
    await deleteAllDataInDatabase();
    setInputValue("");
    setButtonDisabled(true);
    Alert.alert("Data deleted", "All data has been deleted from this device.");
    setLoading(false);
  };

  if (loading) {
    return (
      <ThemedView>
        <List.Section>
          <List.Accordion title="Delete Data">
            <View style={{ padding: 15, gap: 15 }}>
              <Text variant="titleLarge" style={{ textAlign: "center" }}>
                Deleting data...
              </Text>
              <ActivityIndicator size="large" />
            </View>
          </List.Accordion>
        </List.Section>
        <Divider />
      </ThemedView>
    );
  }

  return (
    <ThemedView>
      <List.Section>
        <List.Accordion title="Delete Data">
          <View style={{ paddingLeft: 15, paddingRight: 15, gap: 10 }}>
            <Text>
              Data is stored only on this device and cannot be recovered once
              deleted, are you sure you want to delete it?
            </Text>
            <TextInput
              mode="outlined"
              label="Type 'delete data' to confirm"
              placeholder="delete data"
              value={inputValue}
              onChangeText={(text) => {
                setInputValue(text);
                setButtonDisabled(text.toLowerCase() !== "delete data");
              }}
            />
            <Button
              mode="elevated"
              textColor={theme.colors.onError}
              buttonColor={
                buttonDisabled ? theme.colors.background : theme.colors.error
              }
              disabled={inputValue.toLowerCase() !== "delete data"}
              onPress={handleDeleteData}
            >
              Delete Data
            </Button>
          </View>
        </List.Accordion>
      </List.Section>
      {/* Divider wouldn't show up on Android with the margin added */}
      <Divider style={{ marginBottom: 0.1 }} />
    </ThemedView>
  );
}
