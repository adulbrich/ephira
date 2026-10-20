import { useState } from "react";
import { deleteAllAppData } from "@/services/deleteAllAppData";
import {
  DeletionIncomplete,
  databaseMayBeGone,
} from "@/services/deletionIncomplete";
import { ThemedView } from "@/components/ThemedView";
import {
  ActivityIndicator,
  Text,
  List,
  useTheme,
  Modal,
  Portal,
  IconButton,
  type MD3Theme,
  TextInput,
  Button,
} from "react-native-paper";
import { StyleSheet, Dimensions, Alert, View } from "react-native";
import { useAppRestart } from "@/stores/app-restart";
import { forgetDeletedData } from "@/stores/forget-deleted-data";

/**
 * Deletes everything, then lets the app go on as after a launch whenever the
 * database went, and says how it went. Outside the modal, because the restart
 * can close the modal before the user answers the alert, and its Try Again
 * has to work from wherever the app is by then. `retrying` is true for a run
 * started from that Try Again, which follows a run that emptied the database.
 */
async function deleteAndStartAgain(retrying = false): Promise<void> {
  let deleted = true;
  // Whether the screens behind Settings may now hold rows that are gone.
  let screensOutOfDate = true;
  // Whether the lock is known to be gone with the database, on this run or
  // on the one this retries, so that no lock can sit under the alert.
  let lockGone = true;
  try {
    await deleteAllAppData();
  } catch (error) {
    deleted = false;
    screensOutOfDate = databaseMayBeGone(error);
    lockGone =
      retrying ||
      (error instanceof DeletionIncomplete && error.databaseDeleted);
  }

  if (screensOutOfDate) {
    // The stores outlive every screen, so they let go of what they drew from
    // the database and read back what a launch reads. Then the app starts
    // again from the first screen, as a launch does: screens that read once
    // on mount (the lock setting, pregnancy Home, notification settings)
    // would go on showing what was deleted, and write it back on their next
    // save. After a rollback the database kept everything, and a reset would
    // only send the screens to refresh, and reschedule reminders, from it
    // while the user retries. The reminders and exports removed before the
    // database step stay removed; reminders return at the next refresh.
    await forgetDeletedData();
    useAppRestart.getState().restart();
  }

  if (deleted) {
    Alert.alert("Data deleted", "All data has been deleted from this device.");
  } else {
    // Try Again only when no lock can be left under the alert, which can
    // outlive a trip to the background and sit above the lock view, where a
    // retry would delete behind it. After a first run's rollback the lock is
    // still there, and so is this screen with the confirmation typed.
    Alert.alert(
      "Data not deleted",
      "Not all data could be deleted.",
      lockGone
        ? [
            { text: "Cancel", style: "cancel" },
            {
              text: "Try Again",
              onPress: () => void deleteAndStartAgain(true),
            },
          ]
        : undefined,
    );
  }
}

function DeleteDataModal({ onDismiss }: { onDismiss: () => void }) {
  const theme = useTheme();
  const { width, height } = Dimensions.get("window");
  const styles = makeStyles(theme, width, height);
  const [inputValue, setInputValue] = useState("");
  const [buttonDisabled, setButtonDisabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const onDismissModal = () => {
    onDismiss();
  };

  const handleDeleteData = async () => {
    setLoading(true);
    await deleteAndStartAgain();
    // Only a rollback leaves this screen open, with the confirmation typed;
    // every other outcome restarts the app, which closes it.
    setLoading(false);
  };

  return (
    <Portal>
      <Modal visible={true} onDismiss={onDismissModal} style={styles.modal}>
        <ThemedView style={styles.modalWrapper}>
          <ThemedView style={styles.modalTitleContainer}>
            <IconButton icon="arrow-left" onPress={onDismissModal} />
            {/* The title spans the header, over the arrow. Android ignores
                pointerEvents on a Text, so a View has to pass the taps on. */}
            <View pointerEvents="none" style={styles.modalTitleWrapper}>
              <Text variant="titleLarge" style={styles.modalTitle}>
                Delete Data
              </Text>
            </View>
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

const makeStyles = (theme: MD3Theme, _width: number, height: number) => {
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
    modalTitleWrapper: {
      ...StyleSheet.absoluteFill,
      justifyContent: "center",
    },
    modalTitle: {
      textAlign: "center",
      fontWeight: "bold",
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
