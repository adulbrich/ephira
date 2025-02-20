import { View } from "react-native";
import { Button, Text } from "react-native-paper";
import { useThemeColor } from "@/assets/src/calendar-storage";

const themeColors = ["blue", "brown", "green", "pink", "purple", "yellow"] as const;

export default function ThemeSelector() {
  const { themeColor, setThemeColor } = useThemeColor();

  return (
    <View style={{ padding: 10 }}>
      <Text variant="titleMedium">Select Theme Color</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>
        {themeColors.map((color) => (
          <Button
            key={color}
            mode={themeColor === color ? "contained" : "outlined"}
            onPress={() => setThemeColor(color)}
            style={{ margin: 5 }}
          >
            {color.charAt(0).toUpperCase() + color.slice(1)}
          </Button>
        ))}
      </View>
    </View>
  );
}
