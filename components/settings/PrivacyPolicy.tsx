import { Linking } from "react-native";
import { Divider, List } from "react-native-paper";
import { ThemedView } from "@/components/ThemedView";

// The website's page is the only copy of the policy (#240), so the app and the
// site cannot say different things.
const PRIVACY_POLICY_URL = "https://ephira.capucity.be/privacy";

export default function PrivacyPolicy() {
  return (
    <ThemedView>
      <List.Section>
        <List.Item
          title="Privacy Policy"
          titleStyle={{ fontSize: 20 }}
          right={(props) => <List.Icon {...props} icon="open-in-new" />}
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          accessibilityRole="link"
        />
      </List.Section>
      <Divider />
    </ThemedView>
  );
}
