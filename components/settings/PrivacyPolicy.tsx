import * as WebBrowser from "expo-web-browser";
import { Divider, List } from "react-native-paper";
import { ThemedView } from "@/components/ThemedView";

// The website's page is the only copy of the policy (#240), so the app and the
// site cannot say different things. An in-app browser, not Linking: on iOS it
// keeps the app active, so the lock does not drop the user back on Home.
export const PRIVACY_POLICY_URL = "https://ephira.capucity.be/privacy";

export default function PrivacyPolicy() {
  return (
    <ThemedView>
      <List.Section>
        <List.Item
          title="Privacy Policy"
          titleStyle={{ fontSize: 20 }}
          right={(props) => <List.Icon {...props} icon="open-in-new" />}
          onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
          accessibilityRole="link"
        />
      </List.Section>
      <Divider />
    </ThemedView>
  );
}
