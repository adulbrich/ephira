import { useState, useEffect } from "react";
import {
  getAllSymptoms,
  getAllMoods,
  getAllMedications,
  insertSymptom,
  insertMood,
  insertMedication,
  deleteSymptom,
  deleteMedication,
  deleteMood,
  updateSetting,
} from "@/db/database";
import { ThemedView } from "@/components/ThemedView";
import {
  Text,
  List,
  useTheme,
  Modal,
  Portal,
  IconButton,
  SegmentedButtons,
  MD3Theme,
  Dialog,
  Button,
} from "react-native-paper";
import { StyleSheet, Dimensions } from "react-native";

function ExportDataModal({ onDismiss }: { onDismiss: () => void }) {
  const theme = useTheme();
  const { width, height } = Dimensions.get("window");
  const styles = makeStyles(theme, width, height);
  const [value, setValue] = useState("csv");

  const onDismissModal = () => {
    onDismiss();
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
          <ThemedView style={styles.modalContentContainer}>
            <SegmentedButtons
              value={value}
              onValueChange={setValue}
              buttons={[
                {
                  value: "csv",
                  label: "CSV",
                },
                {
                  value: "pdf",
                  label: "PDF",
                },
              ]}
            />
            {/* TODO: Describe how we format the data in PDF option */}
            {value === "csv" ? (
              <Text variant="bodyLarge" style={styles.exportText}>
                CSV (Comma-Separated Values) files are ideal if you'd like to
                work with your data in spreadsheet programs like Microsoft Excel
                or Google Sheets. The file contains the raw data in a simple
                table format and is usually small in size.
              </Text>
            ) : (
              <Text variant="bodyLarge" style={styles.exportText}>
                PDF (Portable Document Format) files are convenient for viewing
                and sharing. Your data will be organized in a clean,
                easy-to-read layout and can be opened with any PDF reader. The
                file may be slightly larger than the CSV option.
              </Text>
            )}
            <Button
              mode="contained"
              onPress={() => {
                console.log("Exporting data...");
              }}
            >
              Export My Data
            </Button>
          </ThemedView>
        </ThemedView>
      </Modal>
    </Portal>
  );
}

export default function ExportData() {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <ThemedView>
      <List.Item
        title="Export Data"
        description="Export your data to a CSV or PDF file"
        onPress={() => setModalVisible(true)}
        right={(props) => <List.Icon {...props} icon="arrow-right" />}
      />
      {modalVisible && (
        <ExportDataModal onDismiss={() => setModalVisible(false)} />
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
