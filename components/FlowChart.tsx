import { View } from "react-native";
import { Dimensions } from "react-native";
import Svg, {
  Circle,
  Text,
  TSpan,
  Path,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { useEffect, useRef, useMemo } from "react";
import { FlowColors, FlowType } from "@/constants/Colors";
import { useTheme } from "react-native-paper";
import { useData, useFlowData } from "@/assets/src/calendar-storage";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";
import { useFetchFlowData } from "@/hooks/useFetchFlowData";
import {
  getFlowTypeString,
  MAX_FLOW_LENGTH,
  FLOW_TAIL_PERCENT,
  FLOW_TAIL_COLOR,
} from "@/constants/Flow";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const { height } = Dimensions.get("window");

export default function FlowChart() {
  const { data: flowData } = useData();
  const { fetchFlowData } = useFetchFlowData();
  const { flowDataForCurrentMonth, setFlowDataForCurrentMonth } = useFlowData();
  const theme = useTheme();

  // Intial positioning for animated circle
  const position = useSharedValue(275);
  const initialPosition = useRef(275);

  // Coordinates for rendering circles on the flow chart path
  const circleRadius = 45;
  const centerX = 50;
  const centerY = 50;

  const startingPoint = 270; // This is the placement of the gap at the top of the flow chart

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const numberOfDaysInMonth = lastDayOfMonth.getDate();

  // Calculate "today" circle angle and position
  const todayNumber = today.getDate();
  let todayAngle =
    8 + ((todayNumber - 1) * (352 - 8)) / (numberOfDaysInMonth - 1);
  todayAngle = (todayAngle + startingPoint) % 360; // Shift based on start point and ensure it stays within 0-360°

  const triggerAnimation = () => {
    const targetAngle = todayAngle;
    const currentAngle = position.value;

    let newAngle = targetAngle;
    if (targetAngle < currentAngle) {
      newAngle = targetAngle + 360; // Make marker wrap around the circle
    }

    position.value = withTiming(newAngle, {
      duration: 2000,
      easing: Easing.inOut(Easing.cubic),
    });
  };

  // Animated props for today circle
  const animatedCircleProps = useAnimatedProps(() => {
    const todayX =
      centerX + circleRadius * Math.cos((position.value * Math.PI) / 180);
    const todayY =
      centerY + circleRadius * Math.sin((position.value * Math.PI) / 180);
    return { cx: todayX, cy: todayY };
  });

  const arcstartX = 55.7;
  const arcstartY = 5.5;
  const arcendX = 44.3;
  const arcendY = 5.5;
  const arcPath = `M ${arcstartX},${arcstartY} A 45,45 0 0,1 95,50 A 45,45 0 0,1 50,95 A 45,45 0 0,1 5,50 A 45,45 0 0,1 ${arcendX},${arcendY}`;

  const todayFormatted = {
    year: today.toLocaleString("default", { year: "numeric" }),
    month: today.toLocaleString("default", { month: "long" }),
    day: today.toLocaleString("default", { day: "numeric" }),
    weekday: today.toLocaleString("default", { weekday: "long" }),
  };

  const todayMonthDayFormatted = `${todayFormatted.month} ${todayFormatted.day},`;
  const todayWeekdayFormattedWithComma = `${todayFormatted.weekday},`;

  const fetchFlowDataRef = useRef(fetchFlowData);
  const positionRef = useRef(position);
  const triggerAnimationRef = useRef(triggerAnimation);
  fetchFlowDataRef.current = fetchFlowData;
  positionRef.current = position;
  triggerAnimationRef.current = triggerAnimation;

  useFocusEffect(
    React.useCallback(() => {
      fetchFlowDataRef.current();
      runOnJS(() => {
        positionRef.current.value = initialPosition.current;
      })();

      setTimeout(() => {
        triggerAnimationRef.current();
      }, 10);
    }, []),
  );

  const filterFlowDataForCurrentMonth = (flowData: any[]) => {
    if (flowData.length === 0) {
      setFlowDataForCurrentMonth([]);
    } else {
      const firstDayString = firstDayOfMonth.toISOString().split("T")[0];
      const lastDayString = lastDayOfMonth.toISOString().split("T")[0];

      const filteredData = flowData.filter((day) => {
        const dayDateString = day.date.split("T")[0];
        return (
          dayDateString >= firstDayString &&
          dayDateString <= lastDayString &&
          day.flow_intensity &&
          day.flow_intensity > 0 // Explicitly exclude "None" (0)
        );
      });
      setFlowDataForCurrentMonth(filteredData);
    }
  };

  useEffect(() => {
    filterFlowDataForCurrentMonth(flowData);
  }, [flowData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== Gradient + Progress Logic =====
  const flowDays = flowDataForCurrentMonth.length || 0;
  const progress = Math.min(flowDays / MAX_FLOW_LENGTH, 1);
  const C = 2 * Math.PI * circleRadius;

  const visible = C * progress;
  const dashOffset = 0; // makes arc grow right -> left

  const tailLen = Math.min(C * FLOW_TAIL_PERCENT, visible);
  const tailOffset = C - visible;

  const animatedDashProps = useAnimatedProps(() => {
    // strokeDasharray accepts string or number array
    const dashArray: string | number[] = [visible, C];
    return {
      strokeDasharray: dashArray,
      strokeDashoffset: dashOffset,
    };
  });

  // ===== Dynamic Gradient Based on Actual Flow States =====
  // Get unique flow states in chronological order
  const flowStatesInOrder = useMemo(() => {
    if (flowDataForCurrentMonth.length === 0) return [];

    // Sort by date to get chronological order
    const sortedData = [...flowDataForCurrentMonth].sort((a, b) => {
      const dateA = new Date(a.date + "T00:00:00Z").getTime();
      const dateB = new Date(b.date + "T00:00:00Z").getTime();
      return dateA - dateB;
    });

    // Extract unique flow types in order of first appearance
    // Explicitly exclude "None" (flow_intensity 0) from gradient
    const seen = new Set<FlowType>();
    const uniqueFlowTypes: FlowType[] = [];

    for (const data of sortedData) {
      // Skip "None" (flow_intensity 0) - it should not affect the gradient
      if (!data.flow_intensity || data.flow_intensity === 0) {
        continue;
      }
      const flowType = getFlowTypeString(data.flow_intensity);
      if (flowType && !seen.has(flowType)) {
        seen.add(flowType);
        uniqueFlowTypes.push(flowType);
      }
    }

    return uniqueFlowTypes;
  }, [flowDataForCurrentMonth]);

  // Create gradient stops based on actual flow states
  // Scale to 0-90% to leave room for tail fade at 95%
  const gradientStops = useMemo((): React.ReactElement[] => {
    const maxOffset = 90; // Leave room for tail fade

    let stops: React.ReactElement[] = [];

    if (flowStatesInOrder.length === 0) {
      // Default gradient if no flow data
      stops = [
        <Stop key="0" offset="0%" stopColor={FlowColors.spotting} />,
        <Stop key="1" offset={`${maxOffset}%`} stopColor={FlowColors.heavy} />,
      ];
    } else if (flowStatesInOrder.length === 1) {
      // Single flow state - solid color
      const color = FlowColors[flowStatesInOrder[0]];
      stops = [
        <Stop key="0" offset="0%" stopColor={color} />,
        <Stop key="1" offset={`${maxOffset}%`} stopColor={color} />,
      ];
    } else {
      // Multiple flow states - create gradient with proportional stops
      stops = flowStatesInOrder.map((flowType, index) => {
        const offset = (index / (flowStatesInOrder.length - 1)) * maxOffset;
        const color = FlowColors[flowType];
        return <Stop key={index} offset={`${offset}%`} stopColor={color} />;
      });
    }

    // Add tail fade stop at 95% to create smooth transition to purple
    stops.push(<Stop key="tail" offset="95%" stopColor={FLOW_TAIL_COLOR} />);

    return stops;
  }, [flowStatesInOrder]);

  // =====================================

  return (
    <View style={{ padding: 2 }}>
      <Svg height={height * 0.5} width="100%" viewBox="-5 -5 110 110">
        <Defs>
          {/* Main flow gradient - dynamically generated based on actual flow states */}
          <LinearGradient id="flowGradient" x1="100%" y1="0%" x2="0%" y2="100%">
            {gradientStops}
          </LinearGradient>

          {/* Fade-out tail mask */}
          <LinearGradient id="fadeTail" x1="100%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={FLOW_TAIL_COLOR} stopOpacity="0.7" />
            <Stop offset="100%" stopColor={FLOW_TAIL_COLOR} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Base purple ring (always visible) */}
        <Path
          d={arcPath}
          fill="transparent"
          stroke={FLOW_TAIL_COLOR}
          strokeWidth="9"
          strokeLinecap="round"
        />

        {/* Gradient progress ring overlay */}
        {flowDays > 0 && (
          <>
            {/* Main gradient arc */}
            <AnimatedPath
              d={arcPath}
              fill="transparent"
              stroke="url(#flowGradient)"
              strokeWidth="9"
              strokeLinecap="round"
              animatedProps={animatedDashProps}
              accessibilityLabel={`Flow progress: ${flowDays} day${flowDays !== 1 ? "s" : ""} logged`}
            />
            {/* Soft fade overlay */}
            <Path
              d={arcPath}
              fill="transparent"
              stroke="url(#fadeTail)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={`${tailLen} ${C}`}
              strokeDashoffset={tailOffset}
            />
          </>
        )}

        {/* Inner circle and date text */}
        <Circle
          cx="50"
          cy="50"
          r="35"
          fill={theme.colors.secondaryContainer}
          strokeWidth="8"
        />
        <Text
          fill={theme.colors.onSecondaryContainer}
          fontSize="10"
          fontWeight="600"
          textAnchor="middle"
        >
          <TSpan x="50" dy="42">
            {todayWeekdayFormattedWithComma}
          </TSpan>
          <TSpan x="50" dy="12">
            {todayMonthDayFormatted}
          </TSpan>
          <TSpan x="50" dy="12">
            {todayFormatted.year}
          </TSpan>
        </Text>

        {/* Animated circle marker */}
        <AnimatedCircle
          r="5"
          fill="transparent"
          stroke={theme.colors.onSecondaryContainer}
          strokeWidth="1.5"
          animatedProps={animatedCircleProps}
        />
      </Svg>
    </View>
  );
}
