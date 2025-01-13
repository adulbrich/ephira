import { useFonts } from "expo-font"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import "react-native-reanimated"
import {
  PaperProvider,
  MD3LightTheme as DefaultTheme,
  MD3DarkTheme as DarkTheme,
} from "react-native-paper"
import { useColorScheme, View, Text } from "react-native"
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context"
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator"
import migrations from "@/drizzle/migrations"
import { SQLiteProvider } from "expo-sqlite"
import { Suspense } from "react"
import { ActivityIndicator } from "react-native"
import { useDrizzleStudio } from "expo-drizzle-studio-plugin"
import { getDatabase, getDrizzleDatabase } from "@/db/database"

const DB_NAME = "testing.db"
// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const expoDb = getDatabase()
  const db = getDrizzleDatabase()
  useDrizzleStudio(expoDb)
  const { success, error } = useMigrations(db, migrations)
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  })

  const theme = useColorScheme() === "dark" ? DarkTheme : DefaultTheme

  useEffect(() => {
    if (loaded && success) {
      SplashScreen.hideAsync()
    }
  }, [loaded, success])

  if (!loaded) {
    return null
  }

  if (error) {
    console.error(error)
    return (
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <SafeAreaView
            style={{ flex: 1, backgroundColor: theme.colors.background }}
          >
            <View>
              <Text>Database migration error: {error.message}</Text>
            </View>
            <StatusBar style="auto" />
          </SafeAreaView>
        </SafeAreaProvider>
      </PaperProvider>
    )
  }

  return (
    <Suspense fallback={<ActivityIndicator size="large" />}>
      <SQLiteProvider databaseName={DB_NAME} useSuspense>
        <PaperProvider theme={theme}>
          <SafeAreaProvider>
            <SafeAreaView
              style={{ flex: 1, backgroundColor: theme.colors.background }}
            >
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </SafeAreaView>
          </SafeAreaProvider>
        </PaperProvider>
      </SQLiteProvider>
    </Suspense>
  )
}
