import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as LocalAuthentication from "expo-local-authentication";
import * as Crypto from "expo-crypto";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useRef, useCallback } from "react";
import "react-native-reanimated";
import {
  PaperProvider,
  MD3LightTheme as DefaultTheme,
  MD3DarkTheme as DarkTheme,
} from "react-native-paper";
import { useColorScheme, View, AppState, AppStateStatus } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "@/drizzle/migrations";
import { SQLiteProvider } from "expo-sqlite";
import { Suspense } from "react";
import { ActivityIndicator, Alert } from "react-native";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import { AUTH_TYPES, SettingsKeys } from "@/constants/Settings";
import { getDatabase, getDrizzleDatabase, getSetting } from "@/db/database";
import DatabaseMigrationError from "@/components/DatabaseMigrationError";
import PasswordAuthenticationView from "@/components/PasswordAuthenticationView";

const DB_NAME = "testing.db";
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useColorScheme() === "dark" ? DarkTheme : DefaultTheme;
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
    if (loaded && success) {
      checkAuthentication();
    }
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
  );
}
