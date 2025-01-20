import { Text, List, Divider } from "react-native-paper"
import { ThemedView } from "@/components/ThemedView"

export default function PrivacyPolicy() {
  return (
    <ThemedView style={{ height: "100%" }}>
      <List.Section>
        <List.Accordion title="Privacy Policy">
          <List.Item
            title="About Us"
            description="Your privacy is important to us. This app stores all data locally on your device and does not transmit any personal information."
            descriptionNumberOfLines={10}
          />

          <List.Item
            title="Data Collection"
            description="Your privacy is important to us. This app stores all data locally on your device and does not transmit any personal information."
            descriptionNumberOfLines={10}
          />

          <List.Item
            title="Permissions"
            description="Your privacy is important to us. This app stores all data locally on your device and does not transmit any personal information."
            descriptionNumberOfLines={10}
          />
        </List.Accordion>
      </List.Section>
      <Divider />
    </ThemedView>
  )
} 