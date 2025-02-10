import { View } from "react-native";
import { Dimensions } from "react-native";
import Svg, { Circle, Text, TSpan, Path } from "react-native-svg";
import { useEffect, useRef } from "react";
import { FlowColors } from "@/constants/Colors";
import { useTheme } from "react-native-paper";
import { useData, useFlowData } from "@/assets/src/calendar-storage";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";
import { useFetchFlowData } from "@/hooks/useFetchFlowData";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
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

  const renderMarks = () => {
    return flowDataForCurrentMonth.map((data, index) => {
      // Convert date to day of the month
      const dayNumber = new Date(data.date + "T00:00:00Z").getUTCDate();

      let angle = 8 + ((dayNumber - 1) * (352 - 8)) / (numberOfDaysInMonth - 1);
      angle = (angle + startingPoint) % 360;

      const x = centerX + circleRadius * Math.cos((angle * Math.PI) / 180);
      const y = centerY + circleRadius * Math.sin((angle * Math.PI) / 180);

      const markColor = FlowColors[data.flow_intensity ?? 0];

      return <Circle key={index} cx={x} cy={y} r="5" fill={markColor} />;
    });
  };

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
  const animatedProps = useAnimatedProps(() => {
    const todayX =
      centerX + circleRadius * Math.cos((position.value * Math.PI) / 180);
    const todayY =
      centerY + circleRadius * Math.sin((position.value * Math.PI) / 180);
    return {
      cx: todayX,
      cy: todayY,
    };
  });

  // Create a circular path for chart
  const arcstartX = 55.7;
  const arcstartY = 5.5;
  const arcendX = 44.3;
  const arcendY = 5.5;
  const arcPath = `M ${arcstartX},${arcstartY} A 45,45 0 0,1 95,50 A 45,45 0 0,1 50,95 A 45,45 0 0,1 5,50 A 45,45 0 0,1  ${arcendX},${arcendY}`;

  // Format the current month and today's date
  const todayFormatted = {
    year: today.toLocaleString("default", { year: "numeric" }),
    month: today.toLocaleString("default", { month: "long" }),
    day: today.toLocaleString("default", { day: "numeric" }),
    weekday: today.toLocaleString("default", { weekday: "long" }),
  };

  const todayMonthDayFormatted = `${todayFormatted.month} ${todayFormatted.day},`;
  const todayWeekdayFormattedWithComma = `${todayFormatted.weekday},`;

  // Use refs to satisfy lint
  const fetchFlowDataRef = useRef(fetchFlowData);
  const positionRef = useRef(position);
  const triggerAnimationRef = useRef(triggerAnimation);
  fetchFlowDataRef.current = fetchFlowData;
  positionRef.current = position;
  triggerAnimationRef.current = triggerAnimation;

  // useFocusEffect to fetch flow data and run animation when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchFlowDataRef.current();
      runOnJS(() => {
        positionRef.current.value = initialPosition.current; // Reset position to initial value
      })();

      setTimeout(() => {
        triggerAnimationRef.current(); // Run animation after the position is set
      }, 10);
    }, []),
  );

  // Filter flow data for dates within the current month
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
          day.flow_intensity
        );
      });
      setFlowDataForCurrentMonth(filteredData);
    }
  };

  // Updates the current month's data when there are changes in flowData
  useEffect(() => {
    filterFlowDataForCurrentMonth(flowData);
  }, [flowData]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ padding: 2 }}>
      <Svg height={height * 0.5} width="100%" viewBox="-5 -5 110 110">
        <Path
          d={arcPath}
          fill="transparent"
          stroke={theme.colors.secondary}
          strokeWidth="9"
          strokeLinecap="round"
        />
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
        {renderMarks()}
        <AnimatedCircle
          r="5"
          fill="transparent"
          stroke={theme.colors.onSecondaryContainer}
          strokeWidth="1.5"
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}
