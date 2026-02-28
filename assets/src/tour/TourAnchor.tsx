import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { useTour } from "./TourContext";

export function TourAnchor({
  id,
  children,
  style,
}: {
  id: string;
  children: React.ReactNode;
  style?: any;
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
