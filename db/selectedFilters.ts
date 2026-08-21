import { insertSetting } from "@/db/operations/settings";
import { SettingsKeys } from "@/constants/Settings";

/**
 * The name of the Prediction filter, in one place.
 *
 * It was a private constant in the filter dialog and a bare string literal at
 * seven other sites, three of which used it to edit the filter list.
 */
export const PREDICTION_FILTER = "Cycle Prediction";

const FLOW_FILTER = "Flow";

/** One change to the selected filters, as a screen would describe it. */
export type FilterChange =
  | { remove: string }
  | { add: string }
  | { replace: string[] };

/**
 * Flow first, because it is drawn on its own bar and the legend reads left to
 * right. This was written once, correctly, inside the filter dialog's apply
 * handler; nothing told the three other writers that ordering was part of the
 * value.
 */
export function orderFilters(filters: string[]): string[] {
  if (!filters.includes(FLOW_FILTER)) return [...filters];
  return [FLOW_FILTER, ...filters.filter((name) => name !== FLOW_FILTER)];
}

/** What the selected filters become after one change. Pure. */
export function nextFilters(current: string[], change: FilterChange): string[] {
  if ("replace" in change) return orderFilters(change.replace);
  if ("remove" in change) {
    return orderFilters(current.filter((name) => name !== change.remove));
  }
  if (current.includes(change.add)) return orderFilters(current);
  return orderFilters([...current, change.add]);
}

/**
 * Change the selected filters, and say so durably. One operation.
 *
 * Store and disk hold the same list, and this is why they cannot disagree: the
 * caller gets back exactly the array that was written, so there is no second
 * array to hand to the wrong one. Two screens used to compute the updated list,
 * give it to the store, and then write the list from *before* the change to
 * disk; a third edited the store and never wrote the setting at all. Three
 * copies of one rule, three different behaviours.
 *
 * `loadCalendarFilters` in `db/preferences.ts` is the read side and is
 * unchanged.
 */
export async function changeFilters(
  current: string[],
  change: FilterChange,
): Promise<string[]> {
  const next = nextFilters(current, change);
  await insertSetting(SettingsKeys.calendarFilters, JSON.stringify(next));
  return next;
}
