import { Fragment, useState, useEffect } from "react";
import {
  getAllSymptoms,
  getAllMoods,
  getAllMedications,
  updateSetting,
} from "@/db/database";
import { SettingsKeys } from "@/constants/Settings";
import { ThemedView } from "@/components/ThemedView";
import Snackbar from "@/components/ui/Snackbar";
import {
  Text,
  List,
  Divider,
  useTheme,
  Modal,
  Portal,
  IconButton,
  TextInput,
  type MD3Theme,
  Dialog,
  Button,
} from "react-native-paper";
import { ScrollView, StyleSheet, Dimensions } from "react-native";
import {
  useCalendarFilters,
  useDatabaseChangeNotifier,
} from "@/stores/calendar-storage";
import { symptomOptions } from "@/constants/Symptoms";
import { medicationOptions } from "@/constants/Medications";
import { moodOptions } from "@/constants/Moods";
import { birthControlOptions } from "@/constants/BirthControlTypes";
import {
  addCatalogueItem,
  CATALOGUE_KIND_TITLES,
  CATALOGUE_KINDS,
  type CatalogueKind,
  type CatalogueLists,
  catalogueNameTaken,
  emptyCatalogueLists,
  invalidateCatalogue,
  removeCatalogueItem,
} from "@/db/catalogue";

function InfoDialog({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title style={{ textAlign: "center" }}>
          Custom Entries
        </Dialog.Title>
        <Dialog.Content>
          <Text>
            This page allows you to add your own custom entries to the calendar.
            You can add symptoms, moods, and medications that are not already
            included in the app.
          </Text>
          <Text style={{ marginTop: 10 }}>
            Deleting a custom entry will remove it from the calendar and will
            delete all data associated with it. You can also hide a custom entry
            type to remove it from the calendar without deleting any data from
            the Entry Visibility page.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button mode="elevated" onPress={onDismiss}>
            <Text>Close</Text>
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function DeleteEntryDialog({
  visible,
  entryName,
  onCancel,
  onDelete,
}: {
  visible: boolean;
  entryName: string;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel}>
        <Dialog.Title style={{ textAlign: "center" }}>
          Delete Custom Entry
        </Dialog.Title>
        <Dialog.Content>
          <Text>
            Are you sure you want to delete{" "}
            <Text style={{ fontWeight: "bold", color: theme.colors.primary }}>
              {entryName}
            </Text>
            ? This will delete all data associated with this entry and cannot be
            undone.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onCancel}>Cancel</Button>
          <Button mode="elevated" onPress={onDelete}>
            Delete Entry
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function AccordionContents({
  items,
  itemType,
  onAddEntry,
  onDeleteEntry,
}: {
  items: string[];
  itemType: CatalogueKind;
  onAddEntry: (entryType: CatalogueKind, entryName: string) => void;
  onDeleteEntry: (entryType: CatalogueKind, entryName: string) => void;
}) {
  const theme = useTheme();
  const { width, height } = Dimensions.get("window");
  const styles = makeStyles(theme, width, height);
  const [input, setInput] = useState("");
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [entryName, setEntryName] = useState("");
  const [entryType, setEntryType] = useState<CatalogueKind>(itemType);

  return (
    <ScrollView style={styles.scrollview}>
      <ThemedView
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 10,
          gap: 10,
        }}
      >
        <TextInput
          label={`Add new ${itemType}`}
          style={{ flex: 1 }}
          placeholder={`Add new ${itemType}`}
          value={input}
          onChangeText={(text) => setInput(text)}
        />
        <IconButton
          icon="plus"
          mode="contained"
          containerColor={theme.colors.primary}
          iconColor={theme.colors.onPrimary}
          disabled={input.length === 0}
          onPress={() => {
            onAddEntry(itemType, input);
            setInput("");
          }}
        />
      </ThemedView>
      {items.length === 0 && (
        <Text style={{ textAlign: "center", margin: 10 }}>
          No custom {itemType}s found.
        </Text>
      )}
      {items.map((item) => (
        <List.Item
          key={item}
          title={item}
          style={{
            paddingLeft: 16,
          }}
          left={() => (
            <IconButton
              icon="delete"
              mode="contained"
              onPress={() => {
                setEntryName(item);
                setEntryType(itemType);
                setDeleteDialogVisible(true);
              }}
            />
          )}
        />
      ))}
      <DeleteEntryDialog
        visible={deleteDialogVisible}
        entryName={entryName}
        onCancel={() => setDeleteDialogVisible(false)}
        onDelete={() => {
          onDeleteEntry(entryType, entryName);
          setDeleteDialogVisible(false);
        }}
      />
    </ScrollView>
  );
}

function CustomEntriesModal({
  onDismiss,
  initialExpandedCatalogue = "symptom",
}: {
  onDismiss: () => void;
  initialExpandedCatalogue?: CatalogueKind;
}) {
  const theme = useTheme();
  const { width, height } = Dimensions.get("window");
  const styles = makeStyles(theme, width, height);
  const setDbChange = useDatabaseChangeNotifier().setDatabaseChange;
  const { selectedFilters, setSelectedFilters } = useCalendarFilters();
  const [expanded, setExpanded] = useState<string>(initialExpandedCatalogue);
  // Called, not passed: useState treats a bare function as a lazy
  // initializer, which happens to work here and reads like a value.
  const [lists, setLists] = useState<CatalogueLists<string>>(() =>
    emptyCatalogueLists<string>(),
  );
  const [infoDialogVisible, setInfoDialogVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarText, setSnackbarText] = useState("");

  // Get all custom entries from the database. Custom entries are ones that
  // aren't included in the default list of symptoms, moods, and medications.
  useEffect(() => {
    const fetchCustomEntries = async () => {
      const [allSymptoms, allMoods, allMedications] = await Promise.all([
        getAllSymptoms(),
        getAllMoods(),
        getAllMedications(),
      ]);

      // A medication is custom if it is in neither shipped list, whichever
      // Section it belongs to; `type` only decides which of the two it lands
      // in afterwards.
      const customMedications = allMedications.filter(
        (medication) =>
          !medicationOptions.includes(medication.name) &&
          !birthControlOptions.includes(medication.name),
      );

      setLists({
        symptom: allSymptoms
          .filter((symptom) => !symptomOptions.includes(symptom.name))
          .map((symptom) => symptom.name),
        mood: allMoods
          .filter((mood) => !moodOptions.includes(mood.name))
          .map((mood) => mood.name),
        medication: customMedications
          .filter((medication) => medication.type !== "birth control")
          .map((medication) => medication.name),
        "birth control": customMedications
          .filter((medication) => medication.type === "birth control")
          .map((medication) => medication.name),
      });
    };

    fetchCustomEntries();
  }, []);

  /**
   * This screen's own copy of each list. Display state, not the Catalogue.
   *
   * Functional, so two updates in one tick cannot lose each other. The four
   * separate `useState`s this replaces were updated from a closed-over value.
   */
  const updateList = (
    kind: CatalogueKind,
    update: (names: string[]) => string[],
  ) =>
    setLists((previous) => ({ ...previous, [kind]: update(previous[kind]) }));

  const onAddEntry = (entryType: CatalogueKind, entryName: string) => {
    const taken = catalogueNameTaken(entryName, [
      ...CATALOGUE_KINDS.flatMap((kind) => lists[kind]),
      ...symptomOptions,
      ...moodOptions,
      ...medicationOptions,
      ...birthControlOptions,
    ]);
    if (taken) {
      setSnackbarText(`${entryName} already exists.`);
      setSnackbarVisible(true);
      return;
    }

    // Which table a kind means lives in db/catalogue.ts. What is left here is
    // this screen's own list, which is display state.
    addCatalogueItem(entryType, entryName);
    updateList(entryType, (names) => [...names, entryName]);
  };

  const onDeleteEntry = (entryType: CatalogueKind, entryName: string) => {
    removeCatalogueItem(entryType, entryName);
    updateList(entryType, (names) =>
      names.filter((name) => name !== entryName),
    );

    // check if entry is in calendar filters and remove if needed
    if (selectedFilters.includes(entryName)) {
      const updatedFilters = selectedFilters.filter(
        (filter: string) => filter !== entryName,
      );
      setSelectedFilters(updatedFilters);
      updateSetting(
        SettingsKeys.calendarFilters,
        JSON.stringify(selectedFilters),
      );
    }
  };

  const onDismissModal = () => {
    // Say the Catalogue changed. This used to collapse the day view's
    // accordions instead, because their fetch was keyed on that state, which
    // meant adding a custom Mood shut the Section the user was working in.
    invalidateCatalogue();
    // force useLiveQuery to update
    setDbChange(Math.random().toString());
    onDismiss();
  };

  return (
    <Portal>
      <Modal visible={true} onDismiss={() => {}} style={styles.modal}>
        <ThemedView style={styles.modalContentContainer}>
          <ThemedView style={styles.modalTitleContainer}>
            <IconButton icon="arrow-left" onPress={onDismissModal} />
            <Text variant="titleLarge" style={styles.modalTitle}>
              Custom Entries
            </Text>
            <IconButton
              icon="information-outline"
              onPress={() => setInfoDialogVisible(true)}
            />
          </ThemedView>
          <List.AccordionGroup
            expandedId={expanded}
            onAccordionPress={(expandedId) => setExpanded(String(expandedId))}
          >
            {CATALOGUE_KINDS.map((kind) => (
              <Fragment key={kind}>
                <List.Accordion
                  title={CATALOGUE_KIND_TITLES[kind]}
                  id={kind}
                  titleStyle={styles.listTitle}
                >
                  <AccordionContents
                    items={lists[kind]}
                    itemType={kind}
                    onAddEntry={onAddEntry}
                    onDeleteEntry={onDeleteEntry}
                  />
                </List.Accordion>
                <Divider />
              </Fragment>
            ))}
          </List.AccordionGroup>
        </ThemedView>
        <InfoDialog
          visible={infoDialogVisible}
          onDismiss={() => setInfoDialogVisible(false)}
        />
        <Snackbar
          visible={snackbarVisible}
          content={[snackbarText]}
          onDismiss={() => setSnackbarVisible(false)}
        />
      </Modal>
    </Portal>
  );
}

export default function CustomEntries({
  modalVisibleInitially = false,
  onModalClose,
  initialExpandedCatalogue = "symptom",
}: {
  modalVisibleInitially?: boolean;
  onModalClose?: () => void;
  initialExpandedCatalogue?: CatalogueKind;
} = {}) {
  const [modalVisible, setModalVisible] = useState(modalVisibleInitially);

  const handleModalClose = () => {
    setModalVisible(false);
    if (onModalClose) onModalClose();
  };

  return (
    <ThemedView>
      {!modalVisible && (
        <List.Item
          title="Custom Entries"
          description="Add your own custom entries to track"
          onPress={() => setModalVisible(true)}
          right={(props) => <List.Icon {...props} icon="arrow-right" />}
        />
      )}
      {modalVisible && (
        <CustomEntriesModal
          onDismiss={handleModalClose}
          initialExpandedCatalogue={initialExpandedCatalogue}
        />
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
      textAlign: "center",
      fontWeight: "bold",
      color: theme.colors.onPrimaryContainer,
    },
    modalContentContainer: {
      height: "100%",
    },
    listTitle: {
      fontSize: 20,
    },
    scrollview: {
      maxHeight: height * 0.5,
      boxShadow: "inset 0 7px 9px -7px rgba(0,0,0,0.2)",
    },
  });
};
