import { useState } from "react";
import { getAllDataAsJson } from "@/db/database";
import * as FileSystem from "expo-file-system";
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
  MD3Theme,
  Button,
} from "react-native-paper";
import { StyleSheet, Dimensions } from "react-native";

const exportDescriptions: Record<string, string> = {
  csv: "CSV (Comma-Separated Values) files are ideal if you'd like to work with your data in spreadsheet programs like Microsoft Excel or Google Sheets. The file contains the raw data in a simple table format and has the smallest file size of the export options.",
  pdf: "PDF (Portable Document Format) files are convenient for viewing and sharing. Your data will be organized in a clean, easy-to-read layout and can be opened with any PDF reader. The file may be slightly larger than the CSV or JSON option.",
  json: "JSON (JavaScript Object Notation) files are easier to read than CSV files and still editable in a text editor. This format is ideal for developers or users who want to work with the data programmatically. The file size is larger than the CSV option.",
};

async function exportCsv(csvString: string) {
  const fileName = "ephira_data.csv";
  try {
    const fileUri = FileSystem.cacheDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, csvString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (!(await Sharing.isAvailableAsync())) {
      alert("Sharing is not available on this device");
      return;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: "text/csv",
      UTI: "public.comma-separated-values-text",
    });
  } catch (error) {
    console.error("Error saving/sharing CSV:", error);
    alert("Something went wrong while exporting your data.");
  }
}

function formatJsonDataToCsv(jsonData: any) {
  const headers = jsonData["headers"];
  const headerRow: string[] = [...headers.base_header];
  const csvRows: string[] = [];

  // build header row
  headers.symptoms.forEach((s: string) => {
    headerRow.push(`symptom.${s}`);
  });
  headers.moods.forEach((m: string) => {
    headerRow.push(`mood.${m}`);
  });
  headers.medications.forEach((m: string) => {
    headerRow.push(`medication.${m}`);
  });
  headers.birth_control.forEach((bc: string) => {
    headerRow.push(`birth_control.${bc}`);
    headerRow.push(`birth_control.${bc}.notes`);
  });
  csvRows.push(headerRow.join(","));

  // build data rows
  for (const [key, value] of Object.entries(jsonData)) {
    if (key === "headers") continue;

    const entry = value as any;

    const row: string[] = [
      entry.date,
      entry.flow_intensity,
      `"${entry.notes}"`,
    ];

    for (const symptom of headers.symptoms) {
      row.push(entry.symptoms.includes(symptom) ? "x" : "");
    }
    for (const mood of headers.moods) {
      row.push(entry.moods.includes(mood) ? "x" : "");
    }
    for (const medication of headers.medications) {
      const medValue = entry.medications.find(
        (m: any) => m.name === medication,
      );
      row.push(medValue ? "x" : "");
    }
    for (const birthControl of headers.birth_control) {
      const bcValue = entry.birth_control.find(
        (bc: any) => bc.name === birthControl,
      );

      if (bcValue) {
        row.push("x");

        let notes = "";
        if (bcValue.time_taken) {
          notes += `Time Taken: ${bcValue.time_taken}`;
        }
        if (bcValue.notes) {
          notes += ` Notes: ${bcValue.notes}`;
        }
        // wrap the whole note in quotes to preserve potential user commas
        row.push(`"${notes}"`);
      } else {
        row.push("", "");
      }
    }
    csvRows.push(row.join(","));
  }

  const csvString = csvRows.join("\n");
  return csvString;
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
    const data = await getAllDataAsJson();

    switch (format) {
      case "csv":
        const csvString = formatJsonDataToCsv(data);
        await exportCsv(csvString);
        break;
      case "pdf":
        console.log("Exporting data as PDF...");
        break;
      case "json":
        console.log("Exporting data as JSON...");
        break;
    }
    // onDismissModal();
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
            {/* TODO: Describe how we format the data in PDF option */}
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
