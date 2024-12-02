import { SymbolView, SymbolViewProps, SymbolWeight } from "expo-symbols"
import { StyleProp, ViewStyle } from "react-native"

// convert rgba to hex
function rgba2hex(rgba: string) {
  const [r, g, b, a] = rgba
    .replace("rgba(", "")
    .replace(")", "")
    .split(",")
    .map((x) => parseFloat(x))
  return `#${Math.round(r).toString(16)}${Math.round(g).toString(
    16
  )}${Math.round(b).toString(16)}${Math.round(a * 255).toString(16)}`
}

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = "regular",
}: {
  name: SymbolViewProps["name"]
  size?: number
  color: string
  style?: StyleProp<ViewStyle>
  weight?: SymbolWeight
}) {
  if (color.startsWith("rgba")) {
    color = rgba2hex(color)
  }
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={name}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  )
}
