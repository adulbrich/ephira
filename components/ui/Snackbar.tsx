import React from "react";
import { View, StyleSheet } from "react-native";
import { Portal, Snackbar as RnpSnackbar } from "react-native-paper";

interface SavedMessageProps {
  visible: boolean;
  content: string[];
  onDismiss: () => void;
}

const Snackbar = ({ visible, content, onDismiss }: SavedMessageProps) => {
  const message = content.join(" ");

  return (
    <View style={styles.snackbarContainer}>
      <Portal>
        <RnpSnackbar
          visible={visible}
          onDismiss={onDismiss}
          duration={5000}
          action={{
            label: "Dismiss",
            onPress: onDismiss,
          }}
        >
          {message}
        </RnpSnackbar>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  snackbarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default Snackbar;
