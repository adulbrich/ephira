import { List, Divider, Text, useTheme } from "react-native-paper";
import { ThemedView } from "@/components/ThemedView";
import { View, Platform, StyleSheet } from "react-native";

export default function PrivacyPolicy() {
  const theme = useTheme();
  return (
    <ThemedView style={{ height: "100%" }}>
      <List.Section>
        <List.Accordion
          title="Privacy Policy"
          titleStyle={{
            fontSize: 20,
          }}
        >
          <List.Item
            title="About Us"
            description={
              <Text>
                <Text
                  style={[styles.ephiraFont, { color: theme.colors.primary }]}
                >
                  {"\n"}ephira
                </Text>{" "}
                is the encrypted, local-first, menstrual cycle tracking app.
                {"\n\n"}This Privacy Policy sets out how the{" "}
                <Text
                  style={[styles.ephiraFont, { color: theme.colors.primary }]}
                >
                  ephira
                </Text>{" "}
                app uses and protects your personal data that you generate and
                store within the app.
              </Text>
            }
            descriptionNumberOfLines={10}
          />

          <List.Item
            title="Data Use"
            description={
              <Text>
                <Text
                  style={[styles.ephiraFont, { color: theme.colors.primary }]}
                >
                  {"\n"}ephira
                </Text>{" "}
                respects and celebrates your privacy. There is no collection of
                usage data or personal information, no ads, no spyware.{" "}
                <Text
                  style={[styles.ephiraFont, { color: theme.colors.primary }]}
                >
                  ephira
                </Text>{" "}
                stores encrypted data related to menstrual health locally on
                your device.
                {"\n\n"}This includes:{"\n"}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    paddingLeft: 10,
                  }}
                >
                  <Text>{"\u2022" + " "}</Text>
                  <Text style={{ paddingLeft: 5, flex: 1 }}>settings</Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    paddingLeft: 10,
                  }}
                >
                  <Text>{"\u2022" + " "}</Text>
                  <Text style={{ paddingLeft: 5, flex: 1 }}>
                    menstrual cycle tracking data
                  </Text>
                </View>
                {"\n\n"}The data is used to display statistics and apply
                fertility awareness rules. This data cannot be accessed by other
                apps. If you wish to delete all your app data you can do so by:
                {"\n"}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    paddingLeft: 10,
                  }}
                >
                  <Text>{"1." + " "}</Text>
                  <Text style={{ paddingLeft: 5, flex: 1 }}>
                    Navigating to{" "}
                    <Text
                      style={{
                        fontWeight: "bold",
                        color: theme.colors.tertiary,
                      }}
                    >
                      Settings {">"} Delete Data
                    </Text>
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    paddingLeft: 10,
                  }}
                >
                  <Text>{"2." + " "}</Text>
                  <Text style={{ paddingLeft: 5, flex: 1 }}>
                    Type in "
                    <Text style={{ color: theme.colors.tertiary }}>
                      delete data
                    </Text>
                    "
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    paddingLeft: 10,
                  }}
                >
                  <Text>{"3." + " "}</Text>
                  <Text style={{ paddingLeft: 5, flex: 1 }}>
                    Finally press{" "}
                    <Text
                      style={{
                        fontWeight: "bold",
                        color: theme.colors.tertiary,
                      }}
                    >
                      Delete Data
                    </Text>{" "}
                    to confirm.
                  </Text>
                </View>
                {"\n"}This can also be done by uninstalling the app.
                {"\n\n"}Please note that while{" "}
                <Text
                  style={[styles.ephiraFont, { color: theme.colors.primary }]}
                >
                  ephira
                </Text>{" "}
                only saves your data locally, depending on your device settings
                an automatic cloud backup might still take place. We recommend
                checking your general settings to prevent this from happening.
              </Text>
            }
            descriptionNumberOfLines={25}
          />

          <List.Item
            title="Permissions"
            description={
              <Text>
                <Text>
                  <Text
                    style={[styles.ephiraFont, { color: theme.colors.primary }]}
                  >
                    {"\n"}ephira
                  </Text>{" "}
                  includes an optional feature to enhance security by enabling
                  device biometrics, such as fingerprint or face recognition.
                </Text>
                <Text>
                  {"\n\n"}This feature:{"\n"}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    paddingLeft: 10,
                  }}
                >
                  <Text>{"\u2022" + " "}</Text>
                  <Text style={{ paddingLeft: 5, flex: 1 }}>
                    Uses your device's built-in biometric authentication
                    functionality.
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    paddingLeft: 10,
                  }}
                >
                  <Text>{"\u2022" + " "}</Text>
                  <Text style={{ paddingLeft: 5, flex: 1 }}>
                    Does not store or process biometric data within the app. All
                    biometric data remains managed by your device's operating
                    system and is not accessible to{" "}
                    <Text
                      style={[
                        styles.ephiraFont,
                        { color: theme.colors.primary },
                      ]}
                    >
                      ephira
                    </Text>
                    .
                  </Text>
                </View>
                <Text>
                  {"\n\n"}If your device's biometric system requires access to
                  hardware components like the camera for setup or
                  authentication (e.g., for facial recognition), this is managed
                  entirely by your device and not by{" "}
                  <Text
                    style={[styles.ephiraFont, { color: theme.colors.primary }]}
                  >
                    ephira
                  </Text>
                  .
                </Text>
              </Text>
            }
            descriptionNumberOfLines={20}
          />
          <List.Item
            title="Changes to this Privacy Policy"
            description={
              <Text>
                {"\n"}We may update our Privacy Policy from time to time. We
                will notify you of any changes by posting the new Privacy Policy
                on this page.
              </Text>
            }
            descriptionNumberOfLines={10}
          />
          <List.Item
            title="Contact Us"
            description={
              <Text>
                {"\n"}If you have any questions about this Privacy Polcy, you
                can contact us:{"\n"}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    paddingLeft: 10,
                  }}
                >
                  <Text>{"\u2022" + " "}</Text>
                  <Text style={{ paddingLeft: 5, flex: 1 }}>
                    By email: ephira@capucity.be
                  </Text>
                </View>
              </Text>
            }
            descriptionNumberOfLines={10}
          />
        </List.Accordion>
      </List.Section>
      <Divider />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  ephiraFont: {
    fontWeight: "bold",
    fontSize: 15,
    fontFamily: Platform.OS === "ios" ? "Times New Roman" : "serif",
  },
});
