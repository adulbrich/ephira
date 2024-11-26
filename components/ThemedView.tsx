import { View, type ViewProps } from "react-native"
import { useTheme } from "react-native-paper"

// ThemedView altered from Expo Go's example to use React Native Paper's useTheme
export function ThemedView({ style, ...otherProps }: ViewProps) {
  const theme = useTheme()

  return (
    <View
      style={[{ backgroundColor: theme.colors.background }, style]}
      {...otherProps}
    />
  )
}
