import React, { useEffect } from "react";
import { StyleSheet, ViewProps, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useIsFocused } from "@react-navigation/native";
import { useTheme } from "react-native-paper";

interface FadeInViewProps extends ViewProps {
  children: React.ReactNode;
  duration?: number;
  backgroundColor?: string;
}

export default function FadeInView({
  children,
  duration = 300,
  style,
  backgroundColor,
  ...props
}: FadeInViewProps) {
  const opacity = useSharedValue(0);
  const isFocused = useIsFocused();
  const theme = useTheme();

  const bgColor = backgroundColor || theme.colors.background;

  useEffect(() => {
    if (isFocused) {
      opacity.value = 0;
      opacity.value = withTiming(1, {
        duration: duration,
        easing: Easing.out(Easing.ease),
      });
    } else {
      opacity.value = withTiming(0, {
        duration: duration,
        easing: Easing.in(Easing.ease),
      });
    }
  }, [isFocused, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Animated.View
        style={[styles.animatedContainer, animatedStyle, style]}
        {...props}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animatedContainer: {
    flex: 1,
  },
});
