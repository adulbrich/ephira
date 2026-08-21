import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as LocalAuthentication from "expo-local-authentication";
import * as Crypto from "expo-crypto";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import "react-native-reanimated";
import { TourProvider } from "@/assets/src/tour/TourContext";
import { SpotlightOverlay } from "@/assets/src/tour/SpotlightOverlay";
import { PaperProvider } from "react-native-paper";
import {
  useColorScheme,
  View,
  AppState,
  type AppStateStatus,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "@/drizzle/migrations";
import { SQLiteProvider } from "expo-sqlite";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import {
  AUTH_TYPES,
  SettingsKeys,
  DATABASE_NAME,
  TRACKING_MODES,
} from "@/constants/Settings";
import {
  getDatabase,
  getDrizzleDatabase,
  getSetting,
  insertSetting,
  setupEntryTypes,
} from "@/db/database";
import DatabaseMigrationError from "@/components/DatabaseMigrationError";
import PasswordAuthenticationView from "@/components/PasswordAuthenticationView";
import { getTheme } from "@/components/ThemeHandler";
import {
  useCalendarFilters,
  usePredictionChoice,
  useThemeColor,
  useTrackingMode,
} from "@/stores/calendar-storage";
import {
  loadCalendarFilters,
  loadCyclePredictionChoice,
} from "@/db/preferences";
import * as Notifications from "expo-notifications";
import { routeForNotification } from "@/constants/Notifications";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const systemTheme = useColorScheme();
  const isDarkMode = systemTheme === "dark";
  const { themeColor, setThemeColor } = useThemeColor();
  const { setTrackingMode } = useTrackingMode();
  const { setPredictionChoice } = usePredictionChoice();
  const { setSelectedFilters } = useCalendarFilters();

  const expoDb = getDatabase();
  const db = getDrizzleDatabase();
  useDrizzleStudio(expoDb);
  // Nothing below may read the database until this reports success. The tables
  // do not exist before it, so on a fresh install every read here rejected --
  // five unhandled rejections, and neither durable preference hydrated, so a
  // new user got neither their default calendar filters nor a prediction
  // choice on record.
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (!success) return;

    async function fetchThemeColor() {
      const savedTheme = await getSetting("theme");
      if (savedTheme?.value) {
        setThemeColor(savedTheme.value);
      } else {
        setThemeColor("purple");
      }
    }
    fetchThemeColor();
  }, [setThemeColor, success]);

  useEffect(() => {
    if (!success) return;

    async function fetchTrackingMode() {
      const saved = await getSetting(SettingsKeys.trackingMode);
      setTrackingMode(saved?.value ?? TRACKING_MODES.CYCLE);
    }
    fetchTrackingMode();
  }, [setTrackingMode, success]);

  // Durable preferences hydrate in the shell, not on the screen that happens
  // to need them first. These were loaded by the Calendar tab, so any screen
  // reached before it read a store still holding its initial value: the Cycle
  // tab told users predictions were off when their setting said on.
  useEffect(() => {
    if (!success) return;
    loadCyclePredictionChoice().then(setPredictionChoice);
  }, [setPredictionChoice, success]);

  useEffect(() => {
    if (!success) return;
    loadCalendarFilters().then(setSelectedFilters);
  }, [setSelectedFilters, success]);

  const finalSelectedColor = themeColor as
    | "blue"
    | "brown"
    | "green"
    | "pink"
    | "purple"
    | "yellow";
  const theme = getTheme(finalSelectedColor, isDarkMode);

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const router = useRouter();

  const checkAuthentication = useCallback(async () => {
    try {
      const authType = await getSetting(SettingsKeys.authentication);

      if (authType?.value === AUTH_TYPES.BIOMETRIC) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to access the app",
        });
        if (result.success) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } else if (authType?.value === AUTH_TYPES.PASSWORD) {
        setIsPasswordModalVisible(true);
      } else {
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error("Authentication error:", err);
      setIsAuthenticated(false);
    } finally {
      SplashScreen.hideAsync();
    }
  }, []);

  // Handle notification taps
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log("[Notification] Tapped:", data?.type);

        // A notification can arrive with no payload at all, which SDK 55 made
        // explicit in the type. Reading .type off it used to throw here.
        const route = routeForNotification(data);
        if (route) router.push(route);
      },
    );

    return () => subscription.remove();
  }, [router]);

  // re-authenticate user if needed when app is brought back to the foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current === "background" && nextAppState === "active") {
        checkAuthentication();
      } else if (nextAppState === "background") {
        setIsAuthenticated(false);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [checkAuthentication]);

  useEffect(() => {
    // The gate used to sit around checkAuthentication only, so the seeding
    // above it ran on every mount whether the tables existed or not.
    if (!success) return;

    const initializeDatabase = async () => {
      const isDatabaseSetup = await getSetting(
        SettingsKeys.databaseInitialSetup,
      );
      if (isDatabaseSetup?.value !== "0000") {
        await setupEntryTypes();
        await insertSetting(SettingsKeys.databaseInitialSetup, "0000");
      }

      if (loaded) {
        checkAuthentication();
      }
    };

    initializeDatabase().catch((err) => {
      console.error("Database initialisation failed:", err);
    });
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
    } else {
      Alert.alert("Error", "Incorrect password. Please try again.");
    }
  };

  if (!loaded) {
    return null;
  }

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
    <TourProvider>
      <SpotlightOverlay />

      <Suspense fallback={<ActivityIndicator size="large" />}>
        <SQLiteProvider databaseName={DATABASE_NAME} useSuspense>
          <PaperProvider theme={theme}>
            <SafeAreaProvider>
              <SafeAreaView
                style={{ flex: 1, backgroundColor: theme.colors.background }}
              >
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(onboarding)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="(pregnancy-tabs)" />
                </Stack>

                <StatusBar style="auto" />
              </SafeAreaView>
            </SafeAreaProvider>
          </PaperProvider>
        </SQLiteProvider>
      </Suspense>
    </TourProvider>
  );
}
