import {
  PregnancyRingDarkViolet,
  PregnancyRingLilac,
} from "@/constants/Colors";

/** Layout and SVG styling for the pregnancy home progress ring. */
export const PREGNANCY_RING_VISUALS = {
  size: 290,
  stroke: 20,
  centerPanelSize: 212,
  centerPanelPaddingHorizontal: 20,
  centerGap: 6,
  wrapperMarginBottom: 18,
  gradientMidViolet: "#A78BFA",
  bubbleInnerWhiteStart: "#FFFFFF",
  bubbleInnerWhiteStartOpacity: 0.24,
  bubbleInnerLilacMidOpacity: 0.1,
  bubbleInnerVioletEndOpacity: 0.12,
  bubbleHighlightWhiteStartOpacity: 0.28,
  bubbleHighlightWhiteEndOpacity: 0.02,
  trackOpacity: 0.45,
  outerGlowOpacity: 0.14,
  innerGlowOpacity: 0.08,
  innerFillOpacity: 0.85,
  innerStrokeOpacity: 0.16,
  highlightFillOpacity: 0.42,
  innerFillScale: 0.66,
  highlightFillScale: 0.88,
  outerGlowOffset: 2,
  innerGlowOffset: 1,
  gradientStops: {
    startOffset: "0%",
    midOffset: "55%",
    endOffset: "100%",
  },
  lilac: PregnancyRingLilac,
  darkViolet: PregnancyRingDarkViolet,
} as const;
