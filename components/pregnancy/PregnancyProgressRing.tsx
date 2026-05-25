import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { PREGNANCY_RING_VISUALS } from "@/data/pregnancyRingVisuals";
import { interpolateHexColor } from "@/utils/colorInterpolation";

type PregnancyProgressRingProps = {
  weekNumber: number;
  babySize: string;
  ringProgress: number;
};

export default function PregnancyProgressRing({
  weekNumber,
  babySize,
  ringProgress,
}: PregnancyProgressRingProps) {
  const theme = useTheme();
  const visuals = PREGNANCY_RING_VISUALS;

  const ringRadius = (visuals.size - visuals.stroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - ringProgress);
  const ringEndColor = useMemo(
    () =>
      interpolateHexColor(visuals.lilac, visuals.darkViolet, ringProgress),
    [ringProgress, visuals.darkViolet, visuals.lilac],
  );
  const innerBubbleRadius = ringRadius - visuals.stroke * visuals.innerFillScale;
  const highlightRadius =
    ringRadius - visuals.stroke * visuals.highlightFillScale;

  return (
    <View style={styles.progressRingWrapper}>
      <Svg width={visuals.size} height={visuals.size}>
        <Defs>
          <LinearGradient
            id="pregnancyPurpleGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop
              offset={visuals.gradientStops.startOffset}
              stopColor={visuals.lilac}
            />
            <Stop
              offset={visuals.gradientStops.midOffset}
              stopColor={visuals.gradientMidViolet}
            />
            <Stop
              offset={visuals.gradientStops.endOffset}
              stopColor={ringEndColor}
            />
          </LinearGradient>
          <LinearGradient
            id="bubbleInnerFill"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop
              offset={visuals.gradientStops.startOffset}
              stopColor={visuals.bubbleInnerWhiteStart}
              stopOpacity={String(visuals.bubbleInnerWhiteStartOpacity)}
            />
            <Stop
              offset="45%"
              stopColor={visuals.lilac}
              stopOpacity={String(visuals.bubbleInnerLilacMidOpacity)}
            />
            <Stop
              offset={visuals.gradientStops.endOffset}
              stopColor={visuals.darkViolet}
              stopOpacity={String(visuals.bubbleInnerVioletEndOpacity)}
            />
          </LinearGradient>
          <LinearGradient
            id="bubbleHighlightFill"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop
              offset={visuals.gradientStops.startOffset}
              stopColor={visuals.bubbleInnerWhiteStart}
              stopOpacity={String(visuals.bubbleHighlightWhiteStartOpacity)}
            />
            <Stop
              offset={visuals.gradientStops.endOffset}
              stopColor={visuals.bubbleInnerWhiteStart}
              stopOpacity={String(visuals.bubbleHighlightWhiteEndOpacity)}
            />
          </LinearGradient>
        </Defs>
        <Circle
          cx={visuals.size / 2}
          cy={visuals.size / 2}
          r={innerBubbleRadius}
          fill="url(#bubbleInnerFill)"
          opacity={visuals.innerFillOpacity}
        />
        <Circle
          cx={visuals.size / 2}
          cy={visuals.size / 2}
          r={innerBubbleRadius}
          stroke={visuals.bubbleInnerWhiteStart}
          strokeWidth={2}
          fill="none"
          opacity={visuals.innerStrokeOpacity}
        />
        <Circle
          cx={visuals.size / 2}
          cy={visuals.size / 2}
          r={highlightRadius}
          fill="url(#bubbleHighlightFill)"
          opacity={visuals.highlightFillOpacity}
        />
        <Circle
          cx={visuals.size / 2}
          cy={visuals.size / 2}
          r={ringRadius}
          stroke={theme.colors.outlineVariant}
          strokeWidth={visuals.stroke}
          fill="none"
          opacity={visuals.trackOpacity}
        />
        <Circle
          cx={visuals.size / 2}
          cy={visuals.size / 2}
          r={ringRadius + visuals.outerGlowOffset}
          stroke={visuals.bubbleInnerWhiteStart}
          strokeWidth={2}
          fill="none"
          opacity={visuals.outerGlowOpacity}
        />
        <Circle
          cx={visuals.size / 2}
          cy={visuals.size / 2}
          r={ringRadius - visuals.innerGlowOffset}
          stroke={visuals.bubbleInnerWhiteStart}
          strokeWidth={1}
          fill="none"
          opacity={visuals.innerGlowOpacity}
        />
        <Circle
          cx={visuals.size / 2}
          cy={visuals.size / 2}
          r={ringRadius}
          stroke="url(#pregnancyPurpleGradient)"
          strokeWidth={visuals.stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={ringCircumference}
          strokeDashoffset={ringOffset}
          transform={`rotate(-90 ${visuals.size / 2} ${visuals.size / 2})`}
        />
      </Svg>
      <View style={styles.progressRingCenter}>
        <Text
          variant="headlineSmall"
          style={[styles.weeksText, { color: theme.colors.primary }]}
        >
          Week {weekNumber}
        </Text>
        <Text
          variant="bodyMedium"
          style={{
            color: theme.colors.onSurfaceVariant,
            textAlign: "center",
          }}
        >
          Baby is the size of a {babySize}
        </Text>
      </View>
    </View>
  );
}

const centerRadius = PREGNANCY_RING_VISUALS.centerPanelSize / 2;

const styles = StyleSheet.create({
  progressRingWrapper: {
    width: PREGNANCY_RING_VISUALS.size,
    height: PREGNANCY_RING_VISUALS.size,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: PREGNANCY_RING_VISUALS.wrapperMarginBottom,
  },
  progressRingCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    gap: PREGNANCY_RING_VISUALS.centerGap,
    width: PREGNANCY_RING_VISUALS.centerPanelSize,
    height: PREGNANCY_RING_VISUALS.centerPanelSize,
    borderRadius: centerRadius,
    paddingHorizontal: PREGNANCY_RING_VISUALS.centerPanelPaddingHorizontal,
  },
  weeksText: {
    fontWeight: "bold",
  },
});
