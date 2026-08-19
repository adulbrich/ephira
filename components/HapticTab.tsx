import type { BottomTabBarButtonProps } from "expo-router/js-tabs";
import { PlatformPressable } from "expo-router/react-navigation";
import * as Haptics from "expo-haptics";

/**
 * expo-router 56 vendors its own fork of react-navigation under
 * `expo-router/build/react-navigation/`, and `Tabs` renders that fork -- not
 * the standalone `@react-navigation/*` packages. The two disagree:
 * the fork types `PlatformPressable`'s `pressColor` as `ColorValue`, the
 * standalone package as `string`.
 *
 * This file used to import from `@react-navigation/bottom-tabs` and
 * `@react-navigation/elements`, so it described a different navigator than
 * the one rendering it. `@react-navigation/elements` was not even a declared
 * dependency; it resolved only because npm hoisted it.
 *
 * `expo-router/js-tabs` and `expo-router/react-navigation` are the supported
 * entry points for the fork; see the SDK 55 to 56 migration guide.
 */
export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios") {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
