import React, { useState, useEffect } from "react";
import { View, Alert, Platform, Keyboard } from "react-native";
import {
  Text,
  Divider,
  List,
  RadioButton,
  Button,
  Dialog,
  Portal,
  useTheme,
  TextInput,
} from "react-native-paper";
import { ThemedView } from "@/components/ThemedView";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const AUTH_TYPES = {
  NONE: "none",
  BIOMETRIC: "biometric",
  PASSWORD: "password",
};

function NoAuthenticationDialog({
  handleConfirm,
  handleCancel,
}: {
  handleConfirm: () => void;
  handleCancel: () => void;
}) {
  return (
    <Portal>
      <Dialog visible={true}>
        <Dialog.Title style={{ textAlign: "center" }}>
          No Authentication
        </Dialog.Title>
        <Dialog.Content>
          <Text>
            Remove authentication? This will allow anyone with access to this
            device to open the app.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handleCancel}>Cancel</Button>
          <Button mode="elevated" onPress={handleConfirm}>
            Confirm
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function BiometricDialog({
  handleConfirm,
  handleCancel,
}: {
  handleConfirm: () => void;
  handleCancel: () => void;
}) {
  return (
    <Portal>
      <Dialog visible={true}>
        <Dialog.Title style={{ textAlign: "center" }}>
          Device Authentication
        </Dialog.Title>
        <Dialog.Content>
          <Text>
            This will allow you to lock the app behind the same authentication
            used to open your device.
          </Text>
          {Platform.OS === "ios" ? (
            <Text>
              iOS allows you to authenticate with Face ID if it's available and
              permission has been given to the app, otherwise it will default to
              asking for your passcode.
            </Text>
          ) : (
            <Text>
              Android allows you to choose from using Face ID, Fingerprint, or
              Passcode to authenticate every time you open the app.
            </Text>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handleCancel}>Cancel</Button>
          <Button mode="elevated" onPress={handleConfirm}>
            Confirm
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function PasswordDialog({
  handleConfirm,
  handleCancel,
}: {
  handleConfirm: (password: string) => void;
  handleCancel: () => void;
}) {
  const theme = useTheme();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [keyboardMargin, setKeyboardMargin] = useState(0);
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (e) => {
        setKeyboardMargin(e.endCoordinates.height);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  useEffect(() => {
    if (confirmPassword !== "" && password !== confirmPassword) {
      setPasswordError(true);
    } else {
      setPasswordError(false);
    }
  }, [password, confirmPassword]);

  return (
    <Portal>
      <Dialog visible={true}>
        <Dialog.Title style={{ textAlign: "center" }}>
          Custom Password
        </Dialog.Title>

        <Dialog.Content>
          <Text>This will allow you to set a custom password.</Text>
          <Divider style={{ marginTop: 15, marginBottom: 10 }} />
          <Text
            variant="headlineMedium"
            style={{
              color: theme.colors.error,
              textAlign: "center",
            }}
          >
            Please be careful!
          </Text>
          <Text>
            All data is stored only on this device, and there is no way to get
            access to your data if you forget your password. If you need to
            reset the password when trying to authenticate, all data will be
            deleted from the app in order to maintain data privacy.
          </Text>
          <Text>
            If you want to reset the password from the this settings screen
            while you are logged in, you will not lose any data.
          </Text>
          <Divider style={{ marginTop: 10, marginBottom: 15 }} />

          <View>
            <TextInput
              mode="outlined"
              label="Password"
              placeholder="Enter password"
              secureTextEntry={!showPassword}
              right={
                <TextInput.Icon
                  icon="eye"
                  onPress={() => {
                    setShowPassword(!showPassword);
                  }}
                />
              }
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              value={password}
              onChangeText={(text) => setPassword(text.replace(/\s/g, ""))}
            />
            <TextInput
              mode="outlined"
              label="Confirm Password"
              placeholder="Enter password Again"
              secureTextEntry={!showConfirmPassword}
              right={
                <TextInput.Icon
                  icon="eye"
                  onPress={() => {
                    setShowConfirmPassword(!showConfirmPassword);
                  }}
                />
              }
              error={passwordError}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              value={confirmPassword}
              onChangeText={(text) =>
                setConfirmPassword(text.replace(/\s/g, ""))
              }
            />
          </View>
        </Dialog.Content>
        <Dialog.Actions
          style={{
            marginBottom: inputFocused ? keyboardMargin : 0,
          }}
        >
          <Button onPress={handleCancel}>Cancel</Button>
          <Button
            disabled={
              passwordError || password === "" || confirmPassword === ""
            }
            mode="elevated"
            onPress={() => handleConfirm(password)}
          >
            Confirm
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

export default function AuthenticationSettings() {
  const [selectedAuth, setSelectedAuth] = useState(AUTH_TYPES.NONE);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showNoAuthDialog, setShowNoAuthDialog] = useState(false);
  const [showBiometricDialog, setShowBiometricDialog] = useState(false);

  // load auth preference from secure store
  useEffect(() => {
    const loadPreferences = async () => {
      const biometricEnabled =
        await SecureStore.getItemAsync("biometricEnabled");
      const passwordEnabled = await SecureStore.getItemAsync("passwordEnabled");

      if (biometricEnabled === "true") {
        setSelectedAuth(AUTH_TYPES.BIOMETRIC);
      } else if (passwordEnabled === "true") {
        setSelectedAuth(AUTH_TYPES.PASSWORD);
      } else {
        setSelectedAuth(AUTH_TYPES.NONE);
      }
    };

    loadPreferences();
  }, []);

  const handleBiometricSetup = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate to enable biometrics",
    });

    if (result.success) {
      await SecureStore.setItemAsync("biometricEnabled", "true");
      await SecureStore.setItemAsync("passwordEnabled", "false");
      setSelectedAuth(AUTH_TYPES.BIOMETRIC);
      Alert.alert("Success", "Biometric authentication enabled!");
    } else {
      Alert.alert(
        "Failed",
        "Biometric authentication failed. This could be due to a lack of biometric data on the device or not having the proper permissions granted.",
      );
    }
  };

  const handleSetPassword = async (password: string) => {
    await SecureStore.setItemAsync("password", password);
    await SecureStore.setItemAsync("passwordEnabled", "true");
    await SecureStore.setItemAsync("biometricEnabled", "false");
    setSelectedAuth(AUTH_TYPES.PASSWORD);
    Alert.alert("Success", "Password set successfully!");
    setShowPasswordDialog(false);
  };

  const handleDisableAuthentication = async () => {
    await SecureStore.setItemAsync("biometricEnabled", "false");
    await SecureStore.setItemAsync("passwordEnabled", "false");
    setSelectedAuth(AUTH_TYPES.NONE);
    Alert.alert("Success", "Authentication disabled.");
  };

  const handleOptionChange = async (value: string) => {
    if (value === AUTH_TYPES.BIOMETRIC) {
      setShowBiometricDialog(true);
    } else if (value === AUTH_TYPES.PASSWORD) {
      setShowPasswordDialog(true);
    } else if (value === AUTH_TYPES.NONE) {
      setShowNoAuthDialog(true);
    }
  };

  return (
    <ThemedView>
      <Divider style={{ marginTop: 10 }} />
      <List.Section>
        <List.Accordion title="Lock App Behind Authentication">
          <RadioButton.Group
            value={selectedAuth}
            onValueChange={handleOptionChange}
          >
            <RadioButton.Item label="None" value={AUTH_TYPES.NONE} />
            <RadioButton.Item
              label="Device Authentication"
              value={AUTH_TYPES.BIOMETRIC}
            />
            <RadioButton.Item
              label="Custom Password"
              value={AUTH_TYPES.PASSWORD}
            />
          </RadioButton.Group>
        </List.Accordion>
      </List.Section>
      {showNoAuthDialog && (
        <NoAuthenticationDialog
          handleConfirm={async () => {
            await handleDisableAuthentication();
            setShowNoAuthDialog(false);
          }}
          handleCancel={() => setShowNoAuthDialog(false)}
        />
      )}

      {showBiometricDialog && (
        <BiometricDialog
          handleConfirm={async () => {
            await handleBiometricSetup();
            setShowBiometricDialog(false);
          }}
          handleCancel={() => setShowBiometricDialog(false)}
        />
      )}

      {showPasswordDialog && (
        <PasswordDialog
          handleConfirm={handleSetPassword}
          handleCancel={() => setShowPasswordDialog(false)}
        />
      )}

      <Divider />
    </ThemedView>
  );
}
