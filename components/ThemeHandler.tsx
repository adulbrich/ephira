import { MD3LightTheme, MD3DarkTheme, MD3Theme } from "react-native-paper";
import blueTheme from "@/constants/themes/blue.json";
import brownTheme from "@/constants/themes/brown.json";
import greenTheme from "@/constants/themes/green.json";
import pinkTheme from "@/constants/themes/pink.json";
import purpleTheme from "@/constants/themes/purple.json";
import yellowTheme from "@/constants/themes/yellow.json";

type ThemeColor = "blue" | "brown" | "green" | "pink" | "purple" | "yellow";

interface ThemeScheme {
  schemes: {
    light: Partial<MD3Theme["colors"]>;
    dark: Partial<MD3Theme["colors"]>;
  };
}

const themes: Record<ThemeColor, ThemeScheme> = {
  blue: blueTheme,
  brown: brownTheme,
  green: greenTheme,
  pink: pinkTheme,
  purple: purpleTheme,
  yellow: yellowTheme,
};

export const getTheme = (color: ThemeColor, isDarkMode: boolean): MD3Theme => {
  const baseTheme = isDarkMode ? MD3DarkTheme : MD3LightTheme;
  const colorScheme =
    themes[color]?.schemes[isDarkMode ? "dark" : "light"] || {};

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      ...colorScheme,
    },
  };
};
