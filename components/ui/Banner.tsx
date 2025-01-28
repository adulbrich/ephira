import { Platform, View } from "react-native";
import { Text } from "react-native-paper";
import { Image } from "react-native";

export default function Banner() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
      }}
    >
      <Image
        source={require("@/assets/images/capstone-app-logo-transparent.png")}
        style={{
          width: 40,
          height: 40,
          marginRight: 10,
          borderRadius: 8,
        }}
      />
      <Text
        variant="headlineMedium"
        style={{
          fontWeight: "bold",
          fontStyle: Platform.OS === "ios" ? "italic" : undefined, 
          fontFamily: Platform.OS === "android" ? "Roboto-Italic" : undefined,
        }}
      >
        ephira
      </Text>
    </View>
  );
}
