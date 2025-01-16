import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import {
  PaperProvider,
  MD3LightTheme as DefaultTheme,
  MD3DarkTheme as DarkTheme,
  Text,
} from "react-native-paper";
import { useColorScheme, View } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";

export default function DatabaseMigrationError({ error }: { error: string }) {
  const theme = useColorScheme() === "dark" ? DarkTheme : DefaultTheme;
  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: theme.colors.background }}
        >
          <View>
            <Text>Database migration error: {error}</Text>
          </View>
          <StatusBar style="auto" />
        </SafeAreaView>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
