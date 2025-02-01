import { View } from "react-native";
import { Dimensions } from "react-native";
import Svg, {
  Circle,
  Text,
  TSpan,
  Defs,
  LinearGradient,
  Stop,
  Path,
} from "react-native-svg";
import { useRef } from "react";
import { FlowColors } from "@/constants/Colors";
import { useTheme } from "react-native-paper";
import { useData } from "@/assets/src/calendar-storage";
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
  const theme = useTheme();
  const position = useSharedValue(278);
  const initialPosition = useRef(278);
  const circleRadius = 45;
  const centerX = 50;
  const centerY = 50;
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const numberOfDaysInMonth = lastDayOfMonth.getDate();
  const startingPoint = 270;

  // Function to check if two dates are consecutive
  const areConsecutive = (date1: string, date2: string): boolean => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return diffTime === 86400000; // 1 day in milliseconds
  };

  const renderBezierCurves = () => {
    let lastDate: string | null = null;
    let lastCoords: { x: number; y: number } | null = null;

    // Collect consecutive days and group them together
    const groupedDates: { dates: string[]; flowIntensities: number[] }[] = [];

    flowData.forEach((data, index) => {
      const dayNumber = new Date(data.date).getUTCDate();
      let angle = 8 + ((dayNumber - 1) * (352 - 8)) / (numberOfDaysInMonth - 1);
      angle = (angle + startingPoint) % 360;

      const x = centerX + circleRadius * Math.cos((angle * Math.PI) / 180);
      const y = centerY + circleRadius * Math.sin((angle * Math.PI) / 180);

      const flowIntensity = data.flow_intensity;

      if (lastDate && areConsecutive(lastDate, data.date)) {
        // If last date is consecutive, push this date and flow intensity to the group
        const lastGroup = groupedDates[groupedDates.length - 1];
        lastGroup.dates.push(data.date);
        lastGroup.flowIntensities.push(flowIntensity);
      } else if (!lastDate || !areConsecutive(lastDate, data.date)) {
        // Create a new group for non-consecutive days
        groupedDates.push({
          dates: [data.date],
          flowIntensities: [flowIntensity],
        });
      }

      lastDate = data.date;
      lastCoords = { x, y };
    });

    // Create a curve for each group of consecutive dates
    const renderedElements: JSX.Element[] = [];
    groupedDates.forEach((group, index) => {
      // Create a single Bézier path for each group of consecutive dates
      let path = "";
      let startCoords = null;
      let endCoords = null;

      const gradientStops: JSX.Element[] = [];

      let lastIsReverse = false; // Track the direction of movement

      group.dates.forEach((date, i) => {
        const dayNumber = new Date(date).getUTCDate();
        let angle =
          8 + ((dayNumber - 1) * (352 - 8)) / (numberOfDaysInMonth - 1);
        angle = (angle + startingPoint) % 360;

        const x = centerX + circleRadius * Math.cos((angle * Math.PI) / 180);
        const y = centerY + circleRadius * Math.sin((angle * Math.PI) / 180);

        if (i === 0) {
          startCoords = { x, y }; // Store the first coordinate
        }

        if (i === group.dates.length - 1) {
          endCoords = { x, y }; // Store the last coordinate
        }

        if (i > 0 && lastCoords !== null) {
          // Draw Bézier curve between previous and current coordinates
          const controlPointX = (lastCoords.x + x) / 2;
          const controlPointY = (lastCoords.y + y) / 2;
          path += ` C${controlPointX} ${controlPointY}, ${controlPointX} ${controlPointY}, ${x} ${y}`;

          // Check if the direction of movement is reversed
          const isReverse = x - lastCoords.x < 0 || y - lastCoords.y < 0;

          // Only calculate the offset if there are consecutive days (length > 1)
          if (group.dates.length > 1) {
            const flowIntensity = group.flowIntensities[i];
            const offset = (i / (group.dates.length - 1)) * 100;

            if (isReverse !== lastIsReverse) {
              // If the direction changes, reverse the gradient stops
              gradientStops.unshift(
                <Stop
                  offset={`${offset}%`}
                  stopColor={FlowColors[flowIntensity]}
                  key={`stop-${i}`}
                />
              );
            } else {
              gradientStops.push(
                <Stop
                  offset={`${offset}%`}
                  stopColor={FlowColors[flowIntensity]}
                  key={`stop-${i}`}
                />
              );
            }
          }

          lastIsReverse = isReverse; // Update direction for next iteration
        } else {
          path = `M${x} ${y}`; // Start the path
        }

        lastCoords = { x, y }; // Update lastCoords for the next iteration
      });

      const gradientId = `gradient-${group.dates.join("-")}`;

      if (group.dates.length === 2) {
        const firstFlowIntensity = group.flowIntensities[0];
        const secondFlowIntensity = group.flowIntensities[1];
        console.log(
          `Applying gradient for 2 consecutive days: ${group.dates[0]} - ${group.dates[1]}`
        );
        console.log(
          `Flow Intensities: ${firstFlowIntensity} -> ${secondFlowIntensity}`
        );
        console.log(
          `Colors: ${FlowColors[firstFlowIntensity]} -> ${FlowColors[secondFlowIntensity]}`
        );

        gradientStops.push(
          <Stop
            offset="0%"
            stopColor={FlowColors[firstFlowIntensity]}
            key={`stop-start`}
          />,
          <Stop
            offset="100%"
            stopColor={FlowColors[secondFlowIntensity]}
            key={`stop-end`}
          />
        );
      }

      // Debugging
      group.dates.forEach((date, i) => {
        const flowIntensity = group.flowIntensities[i];
        const offset = (i / (group.dates.length - 1)) * 100;

        console.log(
          `Date: ${date}, Flow Intensity: ${flowIntensity}, Color: ${FlowColors[flowIntensity]}, Offset: ${offset}%`
        );
      });

      // Ensure correctly order the gradient stops for all consecutive days
      let orderedStops: JSX.Element[] = [];

      // Flag to indicate if the curve is reversed
      let isReversed = false;
      let prevAngle: number | null = null;

      group.dates.forEach((date, i) => {
        if (group.dates.length > 1) {
          const dayNumber = new Date(date).getUTCDate();
          let angle =
            8 + ((dayNumber - 1) * (352 - 8)) / (numberOfDaysInMonth - 1);
          angle = (angle + startingPoint) % 360;

          const flowIntensity = group.flowIntensities[i];
          const offset = (i / (group.dates.length - 1)) * 100;

          // Add gradient stops in order for each date
          orderedStops.push(
            <Stop
              offset={`${offset}%`}
              stopColor={FlowColors[flowIntensity]}
              key={`stop-${date}`}
            />
          );

          // Check if the direction is reversed for the next date
          if (prevAngle !== null) {
            const prevCoords = {
              x: centerX + circleRadius * Math.cos((prevAngle * Math.PI) / 180),
              y: centerY + circleRadius * Math.sin((prevAngle * Math.PI) / 180),
            };
            const currCoords = {
              x: centerX + circleRadius * Math.cos((angle * Math.PI) / 180),
              y: centerY + circleRadius * Math.sin((angle * Math.PI) / 180),
            };

            // Check if the direction is reversed
            isReversed =
              currCoords.x - prevCoords.x < 0 ||
              currCoords.y - prevCoords.y < 0;
          }

          prevAngle = angle; // Store the current angle for the next iteration
        }
      });

      // Reverse the stops if the curve direction is reversed
      if (isReversed) {
        orderedStops = orderedStops.reverse();
      }

      // Debugging
      console.log(
        `Ordered Gradient Stops for ${group.dates.join(", ")}:`,
        orderedStops.map((stop) => stop.props.stopColor)
      );
      console.log("Reversed? ", isReversed);

      // Define the gradient for the current group of consecutive dates
      const gradient = (
        <LinearGradient
          id={gradientId}
          x1={isReversed ? "100%" : "0%"}
          y1={isReversed ? "100%" : "0%"}
          x2={isReversed ? "0%" : "100%"}
          y2={isReversed ? "0%" : "100%"}
          key={gradientId}
        >
          {orderedStops}
        </LinearGradient>
      );
      console.log(`Gradient ID: ${gradientId}`);
      console.log(
        "Gradient Stops:",
        orderedStops.map((stop) => stop.props.stopColor)
      );

      renderedElements.push(
        <React.Fragment key={gradientId}>
          <Defs>{gradient}</Defs>
          <Path
            d={path}
            fill="transparent"
            stroke={`url(#${gradientId})`}
            strokeWidth="10"
            strokeLinecap="round"
          />
        </React.Fragment>
      );
    });

    return renderedElements;
  };

  const renderMarks = () => {
    return flowData.map((data, index) => {
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
      newAngle = targetAngle + 360; // Make travel around the circle
    }

    position.value = withTiming(newAngle, {
      duration: 2000,
      easing: Easing.inOut(Easing.cubic),
    });
  };

  // Animated props for circle
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

  // Create a circular path
  const arcstartX = 55.7;
  const arcstartY = 5.5;
  const arcendX = 44.3;
  const arcendY = 5.5;
  const arcPath = `M ${arcstartX},${arcstartY} A 45,45 0 0,1 95,50 A 45,45 0 0,1 50,95 A 45,45 0 0,1 5,50 A 45,45 0 0,1  ${arcendX},${arcendY}`;

  // Format the current month and today's date
  const todayYearFormatted = today.toLocaleString("default", {
    year: "numeric",
  });
  const todayMonthFormatted = today.toLocaleString("default", {
    month: "long",
  });
  const todayDayFormatted = today.toLocaleString("default", { day: "numeric" });
  const todayWeekdayFormatted = today.toLocaleString("default", {
    weekday: "long",
  });
  const todayMonthYearFormatted = `${todayMonthFormatted} ${todayDayFormatted},`; // Day number with a comma
  const todayWeekdayFormattedWithComma = `${todayWeekdayFormatted},`; // Weekday with a comma
  
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

  return (
    <View style={{ padding: 16 }}>
      <Svg height={height * 0.5} width="100%" viewBox="0 0 100 100">
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
            {todayMonthYearFormatted}
          </TSpan>
          <TSpan x="50" dy="12">
            {todayYearFormatted}
          </TSpan>
        </Text>
        {renderBezierCurves()}
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
