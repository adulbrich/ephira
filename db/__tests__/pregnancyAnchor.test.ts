import { loadPregnancyAnchor, savePregnancyAnchor } from "@/db/pregnancyAnchor";
import { insertSetting } from "@/db/operations/settings";
import { SettingsKeys } from "@/constants/Settings";
import {
  DEFAULT_GESTATION_OFFSET_DAYS,
  MAX_DAY_IN_WEEK_INPUT,
  MAX_PREGNANCY_WEEK_INPUT,
} from "@/constants/Pregnancy";
import {
  anchorFromSetupAnswer,
  gestationalAge,
  setupDefaultsFromAnchor,
} from "@/utils/pregnancyDates";
import { resetTestDatabase } from "@/__tests__/helpers/testDatabase";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

const REFERENCE = new Date(2026, 7, 15);

beforeEach(() => {
  resetTestDatabase();
});

describe("loadPregnancyAnchor", () => {
  it("reports no start date before setup is done", async () => {
    expect(await loadPregnancyAnchor()).toEqual({
      startDateIso: null,
      gestationOffsetDays: DEFAULT_GESTATION_OFFSET_DAYS,
    });
  });

  it("returns what was stored", async () => {
    await savePregnancyAnchor({
      startDateIso: "2026-06-10",
      gestationOffsetDays: 21,
    });

    expect(await loadPregnancyAnchor()).toEqual({
      startDateIso: "2026-06-10",
      gestationOffsetDays: 21,
    });
  });

  it.each([
    ["an empty string", ""],
    ["a word", "abc"],
    ["a value out of range", "999"],
  ])("falls back to the default offset for %s", async (_label, stored) => {
    await insertSetting(SettingsKeys.pregnancyStartDate, "2026-06-10");
    await insertSetting(SettingsKeys.pregnancyGestationOffsetDays, stored);

    expect((await loadPregnancyAnchor()).gestationOffsetDays).toBe(
      DEFAULT_GESTATION_OFFSET_DAYS,
    );
  });

  it("gives every reader the same Gestational Age for a corrupt offset", async () => {
    // The defect this closes: the pregnancy home tab rejected these values and
    // the info tab accepted them, so the two tabs disagreed about the same
    // pregnancy. Now there is one reading, so there is one answer.
    await insertSetting(SettingsKeys.pregnancyStartDate, "2026-06-10");
    await insertSetting(SettingsKeys.pregnancyGestationOffsetDays, "abc");

    const anchor = await loadPregnancyAnchor();
    const age = gestationalAge(
      anchor.startDateIso as string,
      anchor.gestationOffsetDays,
      REFERENCE,
    );

    expect(age).toEqual(
      gestationalAge("2026-06-10", DEFAULT_GESTATION_OFFSET_DAYS, REFERENCE),
    );
  });
});

describe("a pregnancy past full term", () => {
  it("stores the largest week setup accepts, and reads it back", async () => {
    // MAX_GESTATION_OFFSET_DAYS was 280 while setup accepted 42 weeks, which
    // is 294 days. Entering 42 weeks produced an offset every reader then
    // rejected as out of range, so it silently became the default and the app
    // reopened showing week 3.
    const anchor = anchorFromSetupAnswer(
      {
        method: "weeksPregnant",
        weeks: MAX_PREGNANCY_WEEK_INPUT,
        days: MAX_DAY_IN_WEEK_INPUT,
      },
      REFERENCE,
    );
    await savePregnancyAnchor(anchor);

    const loaded = await loadPregnancyAnchor();

    expect(loaded.gestationOffsetDays).toBe(anchor.gestationOffsetDays);
    expect(setupDefaultsFromAnchor(loaded, REFERENCE).weeks).toBe(
      MAX_PREGNANCY_WEEK_INPUT,
    );
  });

  it("round-trips through setup without changing the stored anchor", async () => {
    // Week 43: the dialog showed 42 and then refused to save it, so editing
    // the start date was impossible once a pregnancy ran past its due date.
    const anchor = anchorFromSetupAnswer(
      { method: "weeksPregnant", weeks: 43, days: 0 },
      REFERENCE,
    );
    await savePregnancyAnchor(anchor);

    const loaded = await loadPregnancyAnchor();
    const shown = setupDefaultsFromAnchor(loaded, REFERENCE);
    expect(shown.weeks).toBe(MAX_PREGNANCY_WEEK_INPUT);

    // Saving what the dialog displays is now accepted.
    await savePregnancyAnchor(
      anchorFromSetupAnswer(
        { method: "weeksPregnant", weeks: shown.weeks, days: shown.days },
        REFERENCE,
      ),
    );

    const resaved = await loadPregnancyAnchor();
    expect(setupDefaultsFromAnchor(resaved, REFERENCE).weeks).toBe(
      MAX_PREGNANCY_WEEK_INPUT,
    );
  });
});
