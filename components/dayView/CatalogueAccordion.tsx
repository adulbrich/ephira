import { useState } from "react";
import { View } from "react-native";
import { List, Text, Button } from "react-native-paper";
import ChipSelection from "./ChipSelection";
import CustomEntries from "@/components/settings/CustomEntries";
import { loggingAccordionTitleStyles } from "@/components/dayView/loggingGridLayout";
import { Section } from "@/constants/Sections";
import type { CatalogueKind } from "@/db/catalogue";

/**
 * The Sections that are a choice from a Catalogue, and how each is presented.
 *
 * Moods, Symptoms and Medications were three files that differed only in these
 * five values, down to the run of six non-breaking spaces in the title.
 */
export const CATALOGUE_SECTIONS = {
  [Section.Symptoms]: {
    title: "Symptoms",
    icon: "alert-decagram",
    chipLabel: "Select Symptoms",
    addLabel: "Add Your Symptom",
    kind: "symptom" as CatalogueKind,
  },
  [Section.Moods]: {
    title: "Moods",
    icon: "emoticon",
    chipLabel: "Select Moods",
    addLabel: "Add Your Mood",
    kind: "mood" as CatalogueKind,
  },
  [Section.Medications]: {
    title: "Medications",
    icon: "pill",
    chipLabel: "Select Medications:",
    addLabel: "Add Your Medication",
    kind: "medication" as CatalogueKind,
  },
} as const;

export type CatalogueSection = keyof typeof CATALOGUE_SECTIONS;

/**
 * What the header counts.
 *
 * Only selections the user can still see: hiding a Catalogue item in settings
 * does not unselect it on days already logged, and counting it would show a
 * number the chips below do not account for.
 */
export function visibleSelection(
  options: string[],
  selected: string[],
): string[] {
  return selected.filter((name) => options.includes(name));
}

/**
 * One Section whose value is a choice from a Catalogue.
 *
 * It receives the list as data and never fetches, so which Catalogue it shows
 * and where that Catalogue came from are the caller's business.
 */
export default function CatalogueAccordion({
  section,
  state,
  setExpandedAccordion,
  options,
  selected,
  setSelected,
}: {
  section: CatalogueSection;
  state: Section | null;
  setExpandedAccordion: (section: Section | null) => void;
  options: string[];
  selected: string[];
  setSelected: (values: string[]) => void;
}) {
  const [customEntriesVisible, setCustomEntriesVisible] = useState(false);
  const presentation = CATALOGUE_SECTIONS[section];

  return (
    <>
      <List.Accordion
        title={
          <View style={loggingAccordionTitleStyles.row}>
            <Text style={loggingAccordionTitleStyles.label}>
              {presentation.title}
            </Text>
            <Text style={loggingAccordionTitleStyles.value}>
              |{"      "}
              {visibleSelection(options, selected).length + " Selected"}
            </Text>
          </View>
        }
        expanded={state === section}
        onPress={() => setExpandedAccordion(state === section ? null : section)}
        left={(props) => <List.Icon {...props} icon={presentation.icon} />}
      >
        <ChipSelection
          options={options}
          selectedValues={selected}
          setSelectedValues={setSelected}
          label={presentation.chipLabel}
        />

        <View
          style={{
            width: "100%",
            maxWidth: "100%",
            padding: 6,
            paddingHorizontal: 20,
            marginBottom: 14,
          }}
        >
          <Button
            mode="contained-tonal"
            icon="plus"
            onPress={() => setCustomEntriesVisible(true)}
          >
            {presentation.addLabel}
          </Button>
        </View>
      </List.Accordion>

      {/* navigate to custom entries */}
      {customEntriesVisible && (
        <CustomEntries
          modalVisibleInitially={true}
          initialExpandedCatalogue={presentation.kind}
          onModalClose={() => setCustomEntriesVisible(false)}
        />
      )}
    </>
  );
}
