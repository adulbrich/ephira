import { ThemedView } from "@/components/ThemedView";
import { List } from "react-native-paper";
import EntryVisibilitySettings from "@/components/settings/EntryVisibilitySettings";
import CustomEntries from "@/components/settings/CustomEntries";

export default function Customization() {
  return (
    <ThemedView>
      <List.Section>
        <List.Accordion
          title="Customization"
          titleStyle={{
            fontSize: 20,
          }}
        >
          <EntryVisibilitySettings />
          <CustomEntries />
        </List.Accordion>
      </List.Section>
    </ThemedView>
  );
}
