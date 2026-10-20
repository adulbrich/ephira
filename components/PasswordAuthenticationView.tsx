import { useState } from "react";
import {
  Text,
  TextInput,
  Button,
  Dialog,
  Portal,
  useTheme,
  ActivityIndicator,
} from "react-native-paper";
import { deleteAllAppData } from "@/services/deleteAllAppData";

function ForgotPassword({
  onCancel,
  onResetPassword,
}: {
  onCancel: () => void;
  onResetPassword: () => void;
}) {
  const theme = useTheme();

  return (
    <Portal>
      <Dialog
        visible
        dismissable={false}
        style={{ backgroundColor: theme.colors.tertiaryContainer }}
      >
        <Dialog.Title
          style={{
            textAlign: "center",
            color: theme.colors.onTertiaryContainer,
          }}
        >
          CAUTION: Reset Password
        </Dialog.Title>
        <Dialog.Content>
          <Text
            style={{
              marginBottom: 16,
              color: theme.colors.onTertiaryContainer,
            }}
          >
            Password and data are stored only on this device. Resetting the
            password will permanently delete all app data, which cannot be
            recovered. Are you sure you want to proceed?
          </Text>
        </Dialog.Content>
        <Dialog.Actions style={{ justifyContent: "space-between" }}>
          <Button mode="elevated" onPress={onCancel}>
            Cancel
          </Button>
          <Button textColor={theme.colors.error} onPress={onResetPassword}>
            Reset Password
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function DeleteDataDialog({
  loading,
  failed,
  onRetry,
}: {
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
}) {
  return (
    <Portal>
      <Dialog visible dismissable={false}>
        <Dialog.Title style={{ textAlign: "center" }}>
          Deleting Data and Password
        </Dialog.Title>
        <Dialog.Content>
          {loading ? (
            <ActivityIndicator />
          ) : failed ? (
            <Text style={{ marginBottom: 16 }}>
              Some data could not be deleted. Try again.
            </Text>
          ) : (
            <Text style={{ marginBottom: 16 }}>
              Data and password have been deleted. Please restart the app.
            </Text>
          )}
        </Dialog.Content>
        {/* Retried here, because after a restart the lock may be gone and
            Forgot Password with it, if the database went but a file did not. */}
        {!loading && failed && (
          <Dialog.Actions>
            <Button onPress={onRetry}>Try Again</Button>
          </Dialog.Actions>
        )}
      </Dialog>
    </Portal>
  );
}

export default function PasswordAuthenticationView({
  handlePasswordSubmit,
}: {
  handlePasswordSubmit: (password: string) => void;
}) {
  const theme = useTheme();
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [deleteData, setDeleteData] = useState<boolean>(false);
  const [deleteFailed, setDeleteFailed] = useState<boolean>(false);

  const handleResetPassword = async () => {
    setDeleteData(true);
    setLoading(true);
    try {
      await deleteAllAppData();
      setDeleteFailed(false);
    } catch {
      setDeleteFailed(true);
    } finally {
      setLoading(false);
    }
  };

  if (deleteData) {
    return (
      <DeleteDataDialog
        loading={loading}
        failed={deleteFailed}
        onRetry={handleResetPassword}
      />
    );
  }

  if (showForgotPassword) {
    return (
      <ForgotPassword
        onCancel={() => setShowForgotPassword(false)}
        onResetPassword={handleResetPassword}
      />
    );
  }

  return (
    <Portal>
      <Dialog visible dismissable={false}>
        <Dialog.Title style={{ textAlign: "center" }}>
          Authentication required
        </Dialog.Title>
        <Dialog.Content>
          <Text style={{ marginBottom: 16 }}>
            This app is password protected. Please enter the password to
            continue.
          </Text>
          <TextInput
            mode="outlined"
            secureTextEntry={!showPassword}
            label="Password"
            value={passwordInput}
            onChangeText={setPasswordInput}
            right={
              <TextInput.Icon
                icon="eye"
                onPress={() => {
                  setShowPassword(!showPassword);
                }}
              />
            }
          />
        </Dialog.Content>
        <Dialog.Actions style={{ justifyContent: "space-between" }}>
          <Button
            textColor={theme.colors.error}
            onPress={() => setShowForgotPassword(true)}
          >
            Forgot Password
          </Button>
          <Button
            mode="elevated"
            onPress={() => handlePasswordSubmit(passwordInput)}
          >
            Submit
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
