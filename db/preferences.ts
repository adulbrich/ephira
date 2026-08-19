import { getSetting, insertSetting } from "@/db/operations/settings";
import { SettingsKeys } from "@/constants/Settings";

/**
 * Durable preferences, with their defaults.
 *
 * These loaders exist because a Zustand store's initial value is a lie until
 * something hydrates it, and a store that is only hydrated by one screen is
 * not safe to read from any other. `predictionChoice` initialised to `false`
 * and was loaded by the Calendar tab alone, so a user who cold-started into
 * the Cycle tab was told predictions were off while their stored setting said
 * on. Hydration belongs in the app shell; the default belongs here, where it
 * can be tested.
 */

/** Predictions are on unless the user has turned them off. */
export const DEFAULT_CYCLE_PREDICTION_CHOICE = true;

/** What a new user sees on the calendar before they choose. */
export const DEFAULT_CALENDAR_FILTERS = ["Flow", "Any Birth Control"] as const;

/**
 * Reads a stored JSON setting, writing the default down if there is none.
 *
 * A default that is never persisted is not a choice on record: every read has
 * to re-derive it, and two readers can disagree about what it is.
 *
 * A stored value that will not parse falls back to the default rather than
 * throwing. It is a corrupt preference, not a reason to fail a screen, and
 * the previous inline versions of this would have rejected inside an effect.
 */
async function loadJsonSetting<T>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): Promise<T> {
  const stored = await getSetting(key);

  if (stored?.value !== undefined && stored?.value !== null) {
    try {
      const parsed: unknown = JSON.parse(stored.value);
      if (isValid(parsed)) return parsed;
    } catch {
      // fall through to the default
    }
  }

  await insertSetting(key, JSON.stringify(fallback));
  return fallback;
}

export function loadCyclePredictionChoice(): Promise<boolean> {
  return loadJsonSetting(
    SettingsKeys.cyclePredictions,
    DEFAULT_CYCLE_PREDICTION_CHOICE,
    (value): value is boolean => typeof value === "boolean",
  );
}

export function loadCalendarFilters(): Promise<string[]> {
  return loadJsonSetting<string[]>(
    SettingsKeys.calendarFilters,
    [...DEFAULT_CALENDAR_FILTERS],
    (value): value is string[] =>
      Array.isArray(value) && value.every((item) => typeof item === "string"),
  );
}
