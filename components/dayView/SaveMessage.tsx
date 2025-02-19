import React from "react";
import { View, StyleSheet } from "react-native";
import { Portal, Snackbar } from "react-native-paper";

interface SavedMessageProps {
  visible: boolean;
  content: string[];
  onDismiss: () => void;
}

const SaveMessage = ({ visible, content, onDismiss }: SavedMessageProps) => {
  const message = content.join(" ");

  return (
    <View style={styles.snackbarContainer}>
      <Portal>
        <Snackbar
          visible={visible}
          onDismiss={onDismiss}
          duration={5000}
          action={{
            label: "Dismiss",
            onPress: onDismiss,
          }}
        >
          {message}
        </Snackbar>
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

export default SaveMessage;
