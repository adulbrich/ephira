import { useState } from "react";
import { deleteAllDataInDatabase } from "@/db/database";
import { ThemedView } from "@/components/ThemedView";
import {
  ActivityIndicator,
  Text,
  List,
  useTheme,
  Modal,
  Portal,
  IconButton,
  MD3Theme,
  TextInput,
  Button,
} from "react-native-paper";
import { StyleSheet, Dimensions, Alert } from "react-native";
import { useSelectedDate } from "@/assets/src/calendar-storage";

function DeleteDataModal({ onDismiss }: { onDismiss: () => void }) {
  const theme = useTheme();
  const { width, height } = Dimensions.get("window");
  const styles = makeStyles(theme, width, height);
  const [inputValue, setInputValue] = useState("");
  const [buttonDisabled, setButtonDisabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const { setDate } = useSelectedDate();

  const onDismissModal = () => {
    onDismiss();
  };

  const handleDeleteData = async () => {
    setLoading(true);
    await deleteAllDataInDatabase();
    setInputValue("");
    setButtonDisabled(true);
    Alert.alert("Data deleted", "All data has been deleted from this device.");
    setLoading(false);
    setDate("");
  };

  return (
    <Portal>
      <Modal visible={true} onDismiss={() => {}} style={styles.modal}>
        <ThemedView style={styles.modalWrapper}>
          <ThemedView style={styles.modalTitleContainer}>
            <IconButton icon="arrow-left" onPress={onDismissModal} />
            <Text variant="titleLarge" style={styles.modalTitle}>
              Export Data
            </Text>
          </ThemedView>
          <ThemedView style={styles.modalContentContainer}></ThemedView>
          {loading ? (
            <ThemedView style={{ padding: 15, gap: 15 }}>
              <Text variant="titleLarge" style={{ textAlign: "center" }}>
                Deleting data...
              </Text>
              <ActivityIndicator size="large" />
            </ThemedView>
          ) : (
            <ThemedView style={{ paddingLeft: 15, paddingRight: 15, gap: 10 }}>
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
            </ThemedView>
          )}
        </ThemedView>
      </Modal>
    </Portal>
  );
}

export default function DeleteData() {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <ThemedView>
      <List.Item
        title="Delete Data"
        description="Delete all data from this device"
        onPress={() => setModalVisible(true)}
        right={(props) => <List.Icon {...props} icon="arrow-right" />}
      />
      {modalVisible && (
        <DeleteDataModal onDismiss={() => setModalVisible(false)} />
      )}
    </ThemedView>
  );
}

const makeStyles = (theme: MD3Theme, width: number, height: number) => {
  return StyleSheet.create({
    modal: {
      justifyContent: "flex-start",
      height: "100%",
    },
    modalTitleContainer: {
      backgroundColor: theme.colors.primaryContainer,
      padding: 5,
      alignItems: "center",
      justifyContent: "space-between",
      flexDirection: "row",
    },
    modalTitle: {
      position: "absolute",
      left: 0,
      right: 0,
      textAlign: "center",
      fontWeight: "bold",
      pointerEvents: "none",
      color: theme.colors.onPrimaryContainer,
    },
    modalWrapper: {
      height: "100%",
    },
    modalContentContainer: {
      alignItems: "center",
      padding: 20,
      gap: 20,
    },
    exportText: {},
    listTitle: {
      fontSize: 20,
    },
    scrollview: {
      maxHeight: height * 0.5,
      boxShadow: "inset 0 7px 9px -7px rgba(0,0,0,0.2)",
    },
  });
};
