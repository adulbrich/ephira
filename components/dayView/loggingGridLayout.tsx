import { StyleSheet, useWindowDimensions, ViewStyle } from "react-native";

/** Horizontal padding for logging chip grids (matches prior screens). */
export const LOGGING_GRID_PADDING_H = 16;

/** Gap between chips in the flex-wrap grid. */
export const LOGGING_GRID_GAP = 8;

export const loggingGridStyles = StyleSheet.create({
  grid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "flex-start",
    justifyContent: "flex-start",
    gap: LOGGING_GRID_GAP,
    paddingHorizontal: LOGGING_GRID_PADDING_H,
    paddingTop: 8,
    paddingBottom: 16,
  },
  /** Same flex-wrap grid without outer horizontal padding (nested forms). */
  gridInline: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "flex-start",
    justifyContent: "flex-start",
    gap: LOGGING_GRID_GAP,
  },
});

export const loggingAccordionTitleStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
    maxWidth: "100%",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  value: {
    fontSize: 16,
    flexShrink: 1,
  },
});

/**
 * Responsive chip sizing for logging: 1 column on very narrow widths,
 * 2 on phones, 3 on wider layouts. Uses flex-wrap + gap on the parent.
 */
export function useLoggingChipGridStyle(): { chipStyle: ViewStyle } {
  const { width } = useWindowDimensions();
  const inner = Math.max(0, width - LOGGING_GRID_PADDING_H * 2);
  const columns = inner < 340 ? 1 : inner < 560 ? 2 : 3;
  const cell =
    columns === 1
      ? inner
      : Math.max(
          120,
          Math.floor((inner - LOGGING_GRID_GAP * (columns - 1)) / columns),
        );

  return {
    chipStyle: {
      margin: 0,
      minWidth: cell,
      maxWidth: columns === 1 ? inner : cell,
      flexGrow: columns === 1 ? 1 : 0,
      flexShrink: 1,
    },
  };
}
