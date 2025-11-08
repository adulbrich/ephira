/**
 * Constants and configuration for cycle prediction feature
 */

export const CYCLE_PREDICTION_CONSTANTS = {
  /** Default cycle length in days (used when insufficient data) */
  DEFAULT_CYCLE_LENGTH: 28,

  /** Minimum acceptable cycle length in days */
  MIN_CYCLE_LENGTH: 21,

  /** Maximum acceptable cycle length in days */
  MAX_CYCLE_LENGTH: 35,

  /** Minimum number of complete cycles required for reliable predictions */
  MIN_CYCLES_FOR_PREDICTION: 2,

  /** Minimum consecutive flow days to consider it a valid cycle */
  MIN_CONSECUTIVE_DAYS: 3,

  /** Number of months to predict ahead */
  PREDICTION_MONTHS_AHEAD: 3,

  /**
   * Maximum number of future cycles to predict
   * Adjust this value to show more or fewer predicted cycles on the calendar
   * Recommended range: 1-5 cycles
   */
  MAX_FUTURE_CYCLES: 3,
} as const;

export type CyclePredictionConstants = typeof CYCLE_PREDICTION_CONSTANTS;
