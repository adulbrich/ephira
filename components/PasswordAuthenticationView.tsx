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
import { DeletionIncomplete } from "@/services/deletionIncomplete";
import { forgetDeletedData } from "@/stores/forget-deleted-data";

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
              Not all data could be deleted. Try again.
            </Text>
          ) : (
            <Text style={{ marginBottom: 16 }}>
              Data and password have been deleted. Please restart the app.
            </Text>
          )}
        </Dialog.Content>
        {/* Retried here: the database goes even when another step fails, and
            the lock with it, so a trip to the background or a restart may
            open the app with Forgot Password gone. */}
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
    let databaseDeleted = true;
    try {
      await deleteAllAppData();
      setDeleteFailed(false);
    } catch (error) {
      setDeleteFailed(true);
      databaseDeleted =
        !(error instanceof DeletionIncomplete) || error.databaseDeleted;
    }
    // Once the lock is gone a trip to the background unlocks, and the screens
    // that mount then would start from what the stores still hold. After a
    // rollback the lock and the data are both still there.
    if (databaseDeleted) await forgetDeletedData();
    setLoading(false);
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
