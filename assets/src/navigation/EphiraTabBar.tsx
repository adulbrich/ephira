import React from "react";
import { Pressable, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { TourAnchor } from "../tour/TourAnchor";

function labelFor(routeName: string) {
  // expo-router tabs route names may look like "calendar", "cycle", "settings"
  if (routeName.includes("calendar")) return "Calendar";
  if (routeName.includes("cycle")) return "Cycle";
  if (routeName.includes("settings")) return "Settings";
  return routeName;
}

function anchorFor(routeName: string) {
  if (routeName.includes("calendar")) return "tab.calendar";
  if (routeName.includes("cycle")) return "tab.cycle";
  if (routeName.includes("settings")) return "tab.settings";
  return `tab.${routeName}`;
}

export function EphiraTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        paddingBottom: 14,
        paddingTop: 10,
        backgroundColor: "#0f0f0f",
      }}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const label = labelFor(route.name);
        const anchorId = anchorFor(route.name);

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented)
            navigation.navigate(route.name);
        };

        return (
          <View key={route.key} style={{ flex: 1, alignItems: "center" }}>
            <TourAnchor id={anchorId}>
              <Pressable
                onPress={onPress}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: isFocused
                    ? "rgba(255,255,255,0.10)"
                    : "transparent",
                }}
              >
                <Text
                  style={{
                    color: isFocused ? "white" : "rgba(255,255,255,0.65)",
                    fontWeight: "700",
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            </TourAnchor>
          </View>
        );
      })}
    </View>
  );
}
