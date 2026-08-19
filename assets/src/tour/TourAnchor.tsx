import type React from "react";
import { useEffect, useRef } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { useTour } from "./TourContext";

export function TourAnchor({
  id,
  children,
  style,
}: {
  id: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const ref = useRef<View>(null);
  const { registerAnchor } = useTour();

  useEffect(() => {
    registerAnchor(id, ref);
  }, [id, registerAnchor]);

  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}
