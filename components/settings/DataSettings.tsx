import { ThemedView } from "@/components/ThemedView";
import { List } from "react-native-paper";
import ExportData from "@/components/settings/ExportData";
import DeleteData from "@/components/settings/DeleteData";

export default function Customization() {
  return (
    <ThemedView>
      <List.Section>
        <List.Accordion
          title="Data"
          titleStyle={{
            fontSize: 20,
          }}
        >
          <ExportData />
          <DeleteData />
        </List.Accordion>
      </List.Section>
    </ThemedView>
  );
}
