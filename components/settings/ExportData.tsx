import { useState } from "react";
import { getAllDataAsJson } from "@/db/database";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { ThemedView } from "@/components/ThemedView";
import {
  Text,
  List,
  useTheme,
  Modal,
  Portal,
  IconButton,
  SegmentedButtons,
  type MD3Theme,
  Button,
} from "react-native-paper";
import { StyleSheet, Dimensions } from "react-native";
import type { ExportData as ExportDataInterface } from "@/constants/Interfaces";
import { toCsv } from "@/services/exportRows";
import { exportPDF } from "@/components/settings/PdfBuilder";

const exportDescriptions: Record<string, string> = {
  csv: "CSV (Comma-Separated Values) files are ideal if you'd like to work with your data in spreadsheet programs like Microsoft Excel or Google Sheets. The file contains the raw data in a simple table format and has the smallest file size of the export options.",
  pdf: "PDF (Portable Document Format) files are convenient for viewing and sharing. Your data will be organized in a clean, easy-to-read layout and can be opened with any PDF reader. The file may be slightly larger than the CSV or JSON option.",
  json: "JSON (JavaScript Object Notation) files are easier to read than CSV files and still editable in a text editor. This format is ideal for developers or users who want to work with the data programmatically. The file size is larger than the CSV option.",
};

async function exportCsvOrJson(data: string, fileType: string) {
  const fileName = `ephira_data.${fileType}`;
  const mimeType = fileType === "csv" ? "text/csv" : "application/json";
  const UTI =
    fileType === "csv" ? "public.comma-separated-values-text" : "public.json";
  try {
    const fileUri = FileSystem.cacheDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, data, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (!(await Sharing.isAvailableAsync())) {
      alert("Sharing is not available on this device");
      return;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: mimeType,
      UTI: UTI,
    });
  } catch (error) {
    console.error(`Error saving/sharing ${fileType}:`, error);
    alert("Something went wrong while exporting your data.");
  }
}

function ExportDataModal({ onDismiss }: { onDismiss: () => void }) {
  const theme = useTheme();
  const { width, height } = Dimensions.get("window");
  const styles = makeStyles(theme, width, height);
  const [value, setValue] = useState("csv");

  const onDismissModal = () => {
    onDismiss();
  };

  const onExportData = async (format: string) => {
    try {
      const exportData = await getAllDataAsJson();
      if (!exportData) {
        throw new Error("Failed to retrieve data for export.");
      }

      switch (format) {
        case "csv": {
          await exportCsvOrJson(toCsv(exportData), "csv");
          break;
        }
        case "pdf":
          await exportPDF(exportData.dailyData);
          break;
        case "json":
          await exportCsvOrJson(
            JSON.stringify(exportData.dailyData, null, 2),
            "json",
          );
          break;
      }
    } catch (error) {
      // A PDF export used to fail silently: exportPDF caught everything into a
      // console.error, so the share sheet simply never appeared and the user
      // was told nothing.
      console.error(`Error exporting ${format}:`, error);
      alert("Something went wrong while exporting your data.");
    }
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
                {
                  value: "json",
                  label: "JSON",
                },
              ]}
            />
            <Text variant="bodyLarge" style={styles.exportDescriptions}>
              {exportDescriptions[value]}
            </Text>

            <Button
              mode="contained"
              onPress={() => {
                onExportData(value);
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
    exportDescriptions: {},
    listTitle: {
      fontSize: 20,
    },
    scrollview: {
      maxHeight: height * 0.5,
      boxShadow: "inset 0 7px 9px -7px rgba(0,0,0,0.2)",
    },
  });
};
