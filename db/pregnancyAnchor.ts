import { getSetting, updateSetting } from "@/db/operations/settings";
import { SettingsKeys } from "@/constants/Settings";
import { parseGestationOffset } from "@/utils/pregnancyDates";

/**
 * The stored anchor. Everything about a pregnancy is derived from these two.
 *
 * `startDateIso` is null when setup has not been completed. The offset is
 * always usable, because `parseGestationOffset` has already had it.
 */
export type StoredPregnancyAnchor = {
  startDateIso: string | null;
  gestationOffsetDays: number;
};

/**
 * The stored pregnancy anchor, validated, in one place.
 *
 * Three screens read this pair and interpreted it three ways: the setup hook
 * checked the offset was finite and in range, the info tab checked nothing,
 * and the pregnancy home tab hardcoded 14 instead of naming the default. So
 * the same stored value could produce two different Gestational Ages on two
 * tabs of the same app.
 *
 * Shaped like `db/preferences.ts`: one named loader per thing, default and
 * validation behind a call that takes no arguments.
 */
export async function loadPregnancyAnchor(): Promise<StoredPregnancyAnchor> {
  const [startSetting, offsetSetting] = await Promise.all([
    getSetting(SettingsKeys.pregnancyStartDate),
    getSetting(SettingsKeys.pregnancyGestationOffsetDays),
  ]);

  return {
    startDateIso: startSetting?.value ? startSetting.value : null,
    gestationOffsetDays: parseGestationOffset(offsetSetting?.value),
  };
}

/** Record a new anchor. Both halves, or neither. */
export async function savePregnancyAnchor(anchor: {
  startDateIso: string;
  gestationOffsetDays: number;
}): Promise<void> {
  await updateSetting(SettingsKeys.pregnancyStartDate, anchor.startDateIso);
  await updateSetting(
    SettingsKeys.pregnancyGestationOffsetDays,
    String(anchor.gestationOffsetDays),
  );
}
