import { StyleSheet, View, Platform, StatusBar } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { useTheme, MD3Theme, Text } from "react-native-paper";
import FadeInView from "@/components/animations/FadeInView";

export default function Cycle() {
  const theme = useTheme();
  const styles = makeStyles({ theme });

  return (
    <FadeInView duration={200} backgroundColor={theme.colors.background}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text variant="headlineMedium" style={styles.title}>
              Cycle
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Coming soon...
            </Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </FadeInView>
  );
}

const makeStyles = ({ theme }: { theme: MD3Theme }) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
      paddingTop: StatusBar.currentHeight,
      paddingBottom: Platform.select({
        ios: 60,
        default: 0,
      }),
    },
    content: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    title: {
      color: theme.colors.onBackground,
      marginBottom: 8,
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
    },
  });
