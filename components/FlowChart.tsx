import { View, Dimensions } from "react-native";
import Svg, {
  Circle,
  Text,
  TSpan,
  Path,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import React, { useRef, useMemo } from "react";
import { useTheme } from "react-native-paper";
import { useData } from "@/stores/calendar-storage";
import { useFocusEffect } from "expo-router";
import { FLOW_TAIL_COLOR, FLOW_TAIL_PERCENT } from "@/constants/Flow";
import { flowRing } from "@/services/flowRing";
import { startOfLocalDay } from "@/utils/dates";
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
  const theme = useTheme();

  // Intial positioning for animated circle
  const position = useSharedValue(275);
  const initialPosition = useRef(275);

  // Coordinates for rendering circles on the flow chart path
  const circleRadius = 45;
  const centerX = 50;
  const centerY = 50;

  const _startingPoint = 270; // This is the placement of the gap at the top of the flow chart

  // Everything the ring draws, from the Days and a reference day. The month
  // window, the marker angle, the progress fraction and the gradient all used
  // to be computed inline here, where only an SVG could observe them.
  const today = useMemo(() => startOfLocalDay(), []);
  const ring = useMemo(() => flowRing(flowData, today), [flowData, today]);
  const todayAngle = ring.markerAngle;

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

  const positionRef = useRef(position);
  const triggerAnimationRef = useRef(triggerAnimation);
  positionRef.current = position;
  triggerAnimationRef.current = triggerAnimation;

  useFocusEffect(
    React.useCallback(() => {
      runOnJS(() => {
        positionRef.current.value = initialPosition.current;
      })();

      setTimeout(() => {
        triggerAnimationRef.current();
      }, 10);
    }, []),
  );

  // ===== Gradient + Progress Logic =====
  const flowDays = ring.flowDayCount;
  const progress = ring.progress;
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

  // The stops are a rule and live in services/flowRing.ts; turning them into
  // <Stop> elements is drawing and lives here.
  const gradientStops = useMemo(
    (): React.ReactElement[] =>
      ring.stops.map((stop, index) => (
        <Stop
          // biome-ignore lint/suspicious/noArrayIndexKey: stops are positional drawing instructions with no identity of their own
          key={index}
          offset={stop.offset}
          stopColor={stop.color}
        />
      )),
    [ring.stops],
  );

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
