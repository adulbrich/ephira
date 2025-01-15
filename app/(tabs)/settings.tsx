import { ThemedView } from "@/components/ThemedView";
import AuthenticationSettings from "@/components/AuthenticationSettings";
import { View } from "react-native"
import { Text, List, Divider } from "react-native-paper"
import { Link } from "expo-router"

export default function Settings() {
  return (
    <ThemedView style={{ height: "100%", padding: 10 }}>
      <Text variant="titleLarge" style={{ textAlign: "center" }}>
        Settings
      </Text>
      <AuthenticationSettings />
    </ThemedView>
  );
}

//       <Text variant="titleLarge" style={{ marginBottom: 20, textAlign: "center" }}>
//         Settings
//       </Text>
      
//       <List.Section>
//         <Link href="/routers/PrivacyPolicyRouter" asChild>
//           <List.Item
//             title="Privacy Policy"
//             right={props => <List.Icon {...props} icon="chevron-right" />}
//           />
//         </Link>
//         <Divider />
//       </List.Section>
//     </ThemedView>
//   )
// }
