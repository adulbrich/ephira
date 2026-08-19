import { Fragment, useState, useEffect } from "react";
import {
  getAllSymptoms,
  getAllMoods,
  getAllMedications,
  updateSetting,
} from "@/db/database";
import { SettingsKeys } from "@/constants/Settings";
import { ThemedView } from "@/components/ThemedView";
import {
  Text,
  List,
  Divider,
  useTheme,
  Modal,
  Portal,
  IconButton,
  Switch,
  type MD3Theme,
  Dialog,
  Button,
} from "react-native-paper";
import { ScrollView, StyleSheet, Dimensions } from "react-native";
import {
  useCalendarFilters,
  useDatabaseChangeNotifier,
} from "@/stores/calendar-storage";
import {
  CATALOGUE_KIND_TITLES,
  CATALOGUE_KINDS,
  type CatalogueKind,
  type CatalogueLists,
  emptyCatalogueLists,
  invalidateCatalogue,
  setCatalogueItemVisible,
} from "@/db/catalogue";

/**
 * What this screen needs of a catalogue row: enough to list it and toggle it.
 *
 * Replaces three near-identical local interfaces that restated
 * `db/schema.ts`'s Symptom, Mood and Medication and disagreed with them on
 * nullability, which is why every fetch here used to end in an `as` cast.
 */
type VisibilityItem = { id: number; name: string; visible: boolean | null };

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
          Entry Visibility
        </Dialog.Title>
        <Dialog.Content>
          <Text>
            This page allows you to customize the visibility of entries on the
            calendar. You can choose to hide or show specific symptoms, moods,
            and medications. This can be useful if you want to focus on specific
            entries or if you want to remove things you know you won't use.
          </Text>
          <Text style={{ marginTop: 10 }}>
            Hiding an entry type will remove it from the app UI, but any
            corresponding data will still be stored in the database. You can
            always come back to this page to change the visibility of entries
            and view their data on the calendar again.
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

function AccordionContents({
  items,
  itemType,
  onToggleSwitch,
}: {
  items: VisibilityItem[];
  itemType: CatalogueKind;
  onToggleSwitch: (entryType: CatalogueKind, entry: VisibilityItem) => void;
}) {
  const theme = useTheme();
  const { width, height } = Dimensions.get("window");
  const styles = makeStyles(theme, width, height);

  const visibleItems = items
    .filter((item) => item.visible)
    .map((item) => item.name);

  return (
    <ScrollView style={styles.scrollview}>
      {items.map((item) => {
        const isVisible = visibleItems.includes(item.name);
        return (
          <List.Item
            key={item.id}
            title={item.name}
            right={() => (
              <Switch
                // `${item}` here stringified the row to "[object Object]",
                // making every switch in the list share one key.
                key={`${item.id}-${isVisible}`}
                value={isVisible}
                onValueChange={() => onToggleSwitch(itemType, item)}
              />
            )}
          />
        );
      })}
    </ScrollView>
  );
}

function CalendarEntriesModal({ onDismiss }: { onDismiss: () => void }) {
  const theme = useTheme();
  const { width, height } = Dimensions.get("window");
  const styles = makeStyles(theme, width, height);
  const setDbChange = useDatabaseChangeNotifier().setDatabaseChange;
  const { selectedFilters, setSelectedFilters } = useCalendarFilters();
  const [expanded, setExpanded] = useState<string>("1");
  // Called, not passed: useState treats a bare function as a lazy
  // initializer, which happens to work here and reads like a value.
  const [lists, setLists] = useState<CatalogueLists<VisibilityItem>>(() =>
    emptyCatalogueLists<VisibilityItem>(),
  );
  const [infoDialogVisible, setInfoDialogVisible] = useState(false);

  useEffect(() => {
    const fetchEntries = async () => {
      const [allSymptoms, allMoods, allMedications] = await Promise.all([
        getAllSymptoms(),
        getAllMoods(),
        getAllMedications(),
      ]);

      setLists({
        symptom: allSymptoms,
        mood: allMoods,
        medication: allMedications.filter(
          (medication) => medication.type !== "birth control",
        ),
        "birth control": allMedications.filter(
          (medication) => medication.type === "birth control",
        ),
      });
    };

    fetchEntries();
  }, []);

  /**
   * This screen's own copy of each list. Display state, not the Catalogue.
   *
   * Functional, so two updates in one tick cannot lose each other. The four
   * separate `useState`s this replaces were updated from a closed-over value.
   */
  const updateList = (
    kind: CatalogueKind,
    update: (items: VisibilityItem[]) => VisibilityItem[],
  ) =>
    setLists((previous) => ({ ...previous, [kind]: update(previous[kind]) }));

  const onToggleSwitch = (entryType: CatalogueKind, entry: VisibilityItem) => {
    // Which table a kind means lives in db/catalogue.ts. What is left here is
    // this screen's own list, which is display state.
    setCatalogueItemVisible(entryType, entry.name, !entry.visible);

    updateList(entryType, (items) =>
      items.map((item) =>
        item.id === entry.id ? { ...item, visible: !item.visible } : item,
      ),
    );

    // check if entry is in calendar filters and remove if needed
    if (selectedFilters.includes(entry.name) && entry.visible) {
      const updatedFilters = selectedFilters.filter(
        (filter: string) => filter !== entry.name,
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
              Calendar Entries Visibility
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
                    onToggleSwitch={onToggleSwitch}
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
      </Modal>
    </Portal>
  );
}

export default function EntryVisibilitySettings() {
  const [calendarEntriesModalVisible, setCalendarEntriesModalVisible] =
    useState(false);

  return (
    <ThemedView>
      <List.Item
        title="Calendar Entries Visibility"
        description="Choose what's visible on the calendar"
        onPress={() => setCalendarEntriesModalVisible(true)}
        right={(props) => <List.Icon {...props} icon="arrow-right" />}
      />
      {calendarEntriesModalVisible && (
        <CalendarEntriesModal
          onDismiss={() => setCalendarEntriesModalVisible(false)}
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
