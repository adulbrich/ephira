import React from "react";
import { View, Image, TouchableOpacity, useColorScheme } from "react-native";
import { Text } from "react-native-paper";
import { useRouter } from "expo-router";

export default function Banner() {
  const router = useRouter();
  const theme = useColorScheme();

  const navigateToHome = () => {
    // Leads to the home page (index.tsx)
    router.push("/");
  };

  const logoSource = theme === "dark"
    ? require("@/assets/images/capstone-app-logo-transparent.png") // Dark mode image
    : require("@/assets/images/capstone-app-logo-circle.png"); // Light mode image

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
      }}
    >
      <TouchableOpacity
        onPress={navigateToHome}
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Image
          source={logoSource}
          style={{
            width: 40,
            height: 40,
            marginRight: 10,
          }}
        />
        <Text
          variant="headlineMedium"
          style={{
            fontWeight: "600",
          }}
        >
          ephira
        </Text>
      </TouchableOpacity>
    </View>
  );
}
