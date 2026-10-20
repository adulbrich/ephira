import * as WebBrowser from "expo-web-browser";
import { Divider, List } from "react-native-paper";
import { ThemedView } from "@/components/ThemedView";

// The website's page is the only copy of the policy (#240), so the app and the
// site cannot say different things. An in-app browser, not Linking: on iOS it
// keeps the app in the foreground while the page is open, so reading it does
// not lock the app. Android's Custom Tab still sends it to the background.
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
