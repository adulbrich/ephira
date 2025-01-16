import { useState } from "react";
import { View } from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Dialog,
  Portal,
} from "react-native-paper";

export default function PasswordAuthenticationView({
  handlePasswordSubmit,
}: {
  handlePasswordSubmit: (password: string) => void;
}) {
  const theme = useTheme();
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View
      style={{
        padding: 20,
        width: "80%",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: theme.roundness,
        backgroundColor: theme.colors.surfaceVariant,
      }}
    >
      <Text variant="bodyMedium">
        Authentication is required to access this app
      </Text>
      <View style={{ width: "80%" }}>
        <TextInput
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

        <Button onPress={() => handlePasswordSubmit(passwordInput)}>
          Submit
        </Button>
      </View>

      <Portal>
        <Dialog visible dismissable={false}>
          <Dialog.Title>Authentication required</Dialog.Title>
          <Dialog.Content>
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
    </View>
  );
}
