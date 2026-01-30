import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as LocalAuthentication from "expo-local-authentication";
import * as Crypto from "expo-crypto";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import "react-native-reanimated";
import { PaperProvider } from "react-native-paper";
import { useColorScheme, View, AppState, AppStateStatus } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "@/drizzle/migrations";
import { SQLiteProvider } from "expo-sqlite";
import { ActivityIndicator, Alert } from "react-native";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import { AUTH_TYPES, SettingsKeys } from "@/constants/Settings";
import {
  getDatabase,
  getDrizzleDatabase,
  getSetting,
  insertSetting,
  setupEntryTypes,
} from "@/db/database";
import DatabaseMigrationError from "@/components/DatabaseMigrationError";
import PasswordAuthenticationView from "@/components/PasswordAuthenticationView";
import { DATABASE_NAME } from "@/constants/Settings";
import { getTheme } from "@/components/ThemeHandler";
import { useThemeColor, useOnboarding } from "@/assets/src/calendar-storage";
import * as Notifications from "expo-notifications";
import { NotificationTypes } from "@/constants/Notifications";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const systemTheme = useColorScheme();
  const isDarkMode = systemTheme === "dark";
  const { themeColor, setThemeColor } = useThemeColor();

  const hasOnboarded = useOnboarding((s) => s.hasOnboarded);
  const hasNavigatedRef = useRef(false);

  const finalSelectedColor = themeColor as
    | "blue"
    | "brown"
    | "green"
    | "pink"
    | "purple"
    | "yellow";
  const theme = getTheme(finalSelectedColor, isDarkMode);

  const expoDb = getDatabase();
  const db = getDrizzleDatabase();
  useDrizzleStudio(expoDb);
  const { success, error } = useMigrations(db, migrations);

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const appState = useRef<AppStateStatus>(AppState.currentState);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchThemeColor() {
      const savedTheme = await getSetting("theme");
      if (savedTheme && savedTheme.value) {
        setThemeColor(savedTheme.value);
      } else {
        setThemeColor("purple");
      }
    }
    fetchThemeColor();
  }, [setThemeColor]);

  const checkAuthentication = useCallback(async () => {
    try {
      const authType = await getSetting(SettingsKeys.authentication);

      if (authType?.value === AUTH_TYPES.BIOMETRIC) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to access the app",
        });
        setIsAuthenticated(!!result.success);
      } else if (authType?.value === AUTH_TYPES.PASSWORD) {
        setIsPasswordModalVisible(true);
      } else {
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error("Authentication error:", err);
      setIsAuthenticated(false);
    } finally {
      await SplashScreen.hideAsync();
    }
  }, []);

  // ✅ NAVIGATION EFFECT MUST BE UP HERE (before any returns)
  useEffect(() => {
    // only navigate once the app is truly ready AND authenticated
    if (!loaded || !success) return;
    if (!isAuthenticated) return;
    if (hasNavigatedRef.current) return;

    hasNavigatedRef.current = true;

    const target = hasOnboarded ? "/(tabs)" : "/onboarding/name";
    router.replace(target as any);
  }, [loaded, success, isAuthenticated, hasOnboarded, router]);

  // Handle notification taps
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log("[Notification] Tapped:", data.type);

        if (
          data.type === NotificationTypes.PERIOD_UPCOMING ||
          data.type === NotificationTypes.PERIOD_TODAY ||
          data.type === NotificationTypes.PERIOD_LATE
        ) {
          router.push("/(tabs)/calendar");
        }
      },
    );

    return () => subscription.remove();
  }, [router]);

  // re-authenticate user if needed when app is brought back to the foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current === "background" && nextAppState === "active") {
        hasNavigatedRef.current = false; // allow routing again after returning
        checkAuthentication();
      } else if (nextAppState === "background") {
        setIsAuthenticated(false);
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [checkAuthentication]);

  useEffect(() => {
    const initializeDatabase = async () => {
      const isDatabaseSetup = await getSetting(
        SettingsKeys.databaseInitialSetup,
      );
      if (!isDatabaseSetup || isDatabaseSetup.value !== "0000") {
        await setupEntryTypes();
        await insertSetting(SettingsKeys.databaseInitialSetup, "0000");
      }

      if (loaded && success) {
        checkAuthentication();
      }
    };

    initializeDatabase();
  }, [loaded, success, checkAuthentication]);

  const handlePasswordSubmit = async (passwordInput: string) => {
    const storedPassword = await getSetting(SettingsKeys.password);
    const hashedInput = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      passwordInput,
    );
    if (hashedInput === storedPassword?.value) {
      setIsAuthenticated(true);
      setIsPasswordModalVisible(false);
      hasNavigatedRef.current = false; // allow routing after password auth
    } else {
      Alert.alert("Error", "Incorrect password. Please try again.");
    }
  };

  if (!loaded) return null;

  if (error) {
    console.error(error);
    return <DatabaseMigrationError error={error.message} />;
  }

  if (!isAuthenticated) {
    return (
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <SafeAreaView
            style={{ flex: 1, backgroundColor: theme.colors.background }}
          >
            <View
              style={{
                flex: 1,
                height: "100%",
                width: "100%",
                backgroundColor: theme.colors.surface,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {isPasswordModalVisible && (
                <PasswordAuthenticationView
                  handlePasswordSubmit={handlePasswordSubmit}
                />
              )}
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </PaperProvider>
    );
  }

  return (
    <Suspense fallback={<ActivityIndicator size="large" />}>
      <SQLiteProvider databaseName={DATABASE_NAME} useSuspense>
        <PaperProvider theme={theme}>
          <SafeAreaProvider>
            <SafeAreaView
              style={{ flex: 1, backgroundColor: theme.colors.background }}
            >
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                {/* folder is app/onboarding */}
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </SafeAreaView>
          </SafeAreaProvider>
        </PaperProvider>
      </SQLiteProvider>
    </Suspense>
  );
}

