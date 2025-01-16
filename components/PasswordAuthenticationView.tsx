import { useState } from "react";
import { Text, TextInput, Button, Dialog, Portal } from "react-native-paper";

export default function PasswordAuthenticationView({
  handlePasswordSubmit,
}: {
  handlePasswordSubmit: (password: string) => void;
}) {
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
        <Dialog.Actions>
          <Button onPress={() => handlePasswordSubmit(passwordInput)}>
            Submit
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
