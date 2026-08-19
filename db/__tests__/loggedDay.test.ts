import {
  birthControlIn,
  createLoggedDaySaver,
  emptyLoggedDay,
  loadLoggedDay,
  loggedDayChanged,
  medicationsExcludingBirthControl,
  saveLoggedDay,
  type LoggedDay,
} from "@/db/loggedDay";
import { getDay } from "@/db/operations/days";
import {
  medicationEntries,
  moodEntries,
  moods,
  symptomEntries,
  symptoms,
} from "@/db/schema";
import {
  getTestDatabase,
  resetTestDatabase,
} from "@/__tests__/helpers/testDatabase";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

const DATE = "2026-04-01";
const OTHER_DATE = "2026-04-02";

const aDay = (overrides: Partial<LoggedDay> = {}): LoggedDay => ({
  ...emptyLoggedDay(DATE),
  flow: 2,
  ...overrides,
});

beforeEach(() => {
  resetTestDatabase();
});

describe("saveLoggedDay", () => {
  it("creates the Day row before writing its entries", async () => {
    // The rule stated three times with two different answers: quickBirthControl
    // creates a missing Day, the sync hooks silently returned. One answer now.
    await saveLoggedDay(aDay({ moods: ["Calm"] }));

    const day = await getDay(DATE);
    expect(day).toBeTruthy();
    expect(getTestDatabase().select().from(moodEntries).all()).toHaveLength(1);
  });

  it("saves the day's own fields", async () => {
    await saveLoggedDay(
      aDay({
        flow: 3,
        notes: "slept badly",
        isCycleStart: true,
        isCycleEnd: false,
        intercourse: true,
      }),
    );

    expect(await getDay(DATE)).toMatchObject({
      flow_intensity: 3,
      notes: "slept badly",
      is_cycle_start: true,
      is_cycle_end: false,
      intercourse: true,
    });
  });

  it("adds catalogue items it has never seen", async () => {
    await saveLoggedDay(aDay({ symptoms: ["Aura"] }));

    expect(
      getTestDatabase()
        .select()
        .from(symptoms)
        .all()
        .map((s) => s.name),
    ).toEqual(["Aura"]);
  });

  it("reuses a catalogue item that already exists", async () => {
    getTestDatabase().insert(moods).values({ name: "Calm" }).run();

    await saveLoggedDay(aDay({ moods: ["Calm"] }));

    expect(getTestDatabase().select().from(moods).all()).toHaveLength(1);
  });

  it("removes entries the user has deselected", async () => {
    await saveLoggedDay(aDay({ symptoms: ["Cramps", "Nausea"] }));
    await saveLoggedDay(aDay({ symptoms: ["Cramps"] }));

    expect(getTestDatabase().select().from(symptomEntries).all()).toHaveLength(
      1,
    );
  });

  it("is idempotent", async () => {
    const day = aDay({
      symptoms: ["Cramps"],
      moods: ["Calm"],
      medications: [{ name: "Ibuprofen" }],
    });

    await saveLoggedDay(day);
    const first = getTestDatabase().select().from(symptomEntries).all();

    await saveLoggedDay(day);

    expect(getTestDatabase().select().from(symptomEntries).all()).toEqual(
      first,
    );
    expect(getTestDatabase().select().from(moodEntries).all()).toHaveLength(1);
    expect(
      getTestDatabase().select().from(medicationEntries).all(),
    ).toHaveLength(1);
  });

  it("keeps per-entry detail, so a pill taken at 08:00 is expressible", async () => {
    await saveLoggedDay(
      aDay({
        medications: [
          { name: "Pill", timeTaken: "08:00", notes: "with breakfast" },
        ],
      }),
    );

    expect(
      getTestDatabase().select().from(medicationEntries).all()[0],
    ).toMatchObject({ time_taken: "08:00", notes: "with breakfast" });
  });

  it("updates per-entry detail in place rather than duplicating", async () => {
    await saveLoggedDay(
      aDay({ medications: [{ name: "Pill", timeTaken: "08:00" }] }),
    );
    await saveLoggedDay(
      aDay({ medications: [{ name: "Pill", timeTaken: "21:00" }] }),
    );

    const entries = getTestDatabase().select().from(medicationEntries).all();
    expect(entries).toHaveLength(1);
    expect(entries[0].time_taken).toBe("21:00");
  });

  it("leaves no entry pointing at a catalogue item that is gone", async () => {
    // Foreign keys are on in tests, so an ordering mistake fails loudly here.
    await expect(
      saveLoggedDay(aDay({ moods: ["Calm"], symptoms: ["Cramps"] })),
    ).resolves.not.toThrow();
  });
});

describe("loadLoggedDay", () => {
  it("returns an empty day for a date with nothing logged", async () => {
    expect(await loadLoggedDay(DATE)).toEqual(emptyLoggedDay(DATE));
  });

  it("round-trips everything that was saved", async () => {
    const day = aDay({
      flow: 4,
      notes: "heavy",
      isCycleStart: true,
      intercourse: true,
      symptoms: ["Cramps"],
      moods: ["Calm"],
      medications: [{ name: "Pill", timeTaken: "08:00", notes: "am" }],
    });

    await saveLoggedDay(day);

    expect(await loadLoggedDay(DATE)).toEqual(day);
  });

  it("resolves entry names without a per-entry lookup", async () => {
    await saveLoggedDay(
      aDay({ symptoms: ["Cramps", "Nausea", "Aura"], moods: ["Calm", "Sad"] }),
    );

    const loaded = await loadLoggedDay(DATE);

    expect(loaded.symptoms.sort()).toEqual(["Aura", "Cramps", "Nausea"]);
    expect(loaded.moods.sort()).toEqual(["Calm", "Sad"]);
  });

  it("does not leak another day's entries", async () => {
    await saveLoggedDay(aDay({ symptoms: ["Cramps"] }));
    await saveLoggedDay({
      ...emptyLoggedDay("2026-04-02"),
      symptoms: ["Nausea"],
    });

    expect((await loadLoggedDay(DATE)).symptoms).toEqual(["Cramps"]);
  });
});

describe("birth control lives among the medications", () => {
  it("separates the birth control entry from the rest", async () => {
    const day = aDay({
      medications: [
        { name: "Ibuprofen" },
        { name: "Pill", timeTaken: "08:00", notes: "am" },
      ],
    });

    expect(birthControlIn(day)).toEqual({
      name: "Pill",
      timeTaken: "08:00",
      notes: "am",
    });
    expect(medicationsExcludingBirthControl(day)).toEqual(["Ibuprofen"]);
  });

  it("has no birth control when none is logged", () => {
    const day = aDay({ medications: [{ name: "Ibuprofen" }] });

    expect(birthControlIn(day)).toBeNull();
    expect(medicationsExcludingBirthControl(day)).toEqual(["Ibuprofen"]);
  });
});

describe("loggedDayChanged", () => {
  it("ignores the order things were selected in", () => {
    const a = aDay({ symptoms: ["Cramps", "Nausea"] });
    const b = aDay({ symptoms: ["Nausea", "Cramps"] });

    expect(loggedDayChanged(a, b)).toBe(false);
  });

  it("ignores surrounding whitespace in free text", () => {
    expect(
      loggedDayChanged(aDay({ notes: " hi " }), aDay({ notes: "hi" })),
    ).toBe(false);
  });

  it("notices a real change", () => {
    expect(loggedDayChanged(aDay({ flow: 1 }), aDay({ flow: 2 }))).toBe(true);
  });

  it("notices a change to per-entry detail", () => {
    expect(
      loggedDayChanged(
        aDay({ medications: [{ name: "Pill", timeTaken: "08:00" }] }),
        aDay({ medications: [{ name: "Pill", timeTaken: "21:00" }] }),
      ),
    ).toBe(true);
  });
});

describe("the saver's timing rules", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const settle = async () => {
    jest.advanceTimersByTime(100);
    await Promise.resolve();
  };

  it("collapses a burst of edits into one write", async () => {
    const saver = createLoggedDaySaver();
    saver.reset(emptyLoggedDay(DATE));

    const first = saver.schedule(aDay({ flow: 1 }));
    const second = saver.schedule(aDay({ flow: 2 }));
    const third = saver.schedule(aDay({ flow: 3 }));

    await settle();

    expect((await first).status).toBe("superseded");
    expect((await second).status).toBe("superseded");
    expect((await third).status).toBe("saved");
    expect((await getDay(DATE))?.flow_intensity).toBe(3);
  });

  it("does not write when nothing changed", async () => {
    const saver = createLoggedDaySaver();
    const day = aDay({ flow: 2 });
    saver.reset(day);

    const outcome = await saver.schedule(day);

    expect(outcome.status).toBe("unchanged");
    expect(await getDay(DATE)).toBeUndefined();
  });

  it("refuses to save a day other than the one currently open", async () => {
    // The user switched days mid-debounce. Writing the old snapshot now would
    // write it against whichever day is open.
    const saver = createLoggedDaySaver();
    saver.reset(emptyLoggedDay("2026-04-02"));

    const outcome = await saver.schedule(aDay({ flow: 3 }));

    expect(outcome.status).toBe("wrong-day");
    expect(await getDay(DATE)).toBeUndefined();
  });

  it("moves its baseline forward after a successful save", async () => {
    const saver = createLoggedDaySaver();
    saver.reset(emptyLoggedDay(DATE));

    const saved = saver.schedule(aDay({ flow: 3 }));
    await settle();
    await saved;

    expect((await saver.schedule(aDay({ flow: 3 }))).status).toBe("unchanged");
  });

  it("cancels a pending write", async () => {
    const saver = createLoggedDaySaver();
    saver.reset(emptyLoggedDay(DATE));

    const pending = saver.schedule(aDay({ flow: 3 }));
    saver.cancel();
    await settle();

    expect((await pending).status).toBe("superseded");
    expect(await getDay(DATE)).toBeUndefined();
  });

  it("writes a pending edit when the day changes rather than dropping it", async () => {
    // The report: select a flow, tap another day inside the 100ms debounce,
    // and the flow was silently discarded (#162). The user's edit was to the
    // old day, and writing the old snapshot to the old date is correct.
    const saver = createLoggedDaySaver();
    saver.reset(emptyLoggedDay(DATE));

    const pending = saver.schedule(aDay({ flow: 3 }));
    const flushed = await saver.flush();

    expect(flushed.status).toBe("saved");
    expect((await pending).status).toBe("saved");
    expect((await getDay(DATE))?.flow_intensity).toBe(3);
  });

  it("keeps the flushed write on the old day when the new day's load lands first", async () => {
    // DayView flushes in the load effect's cleanup, so the flush starts before
    // loadLoggedDay resolves and calls reset for the new day. The flushed
    // write must still land on the day it was made against.
    const saver = createLoggedDaySaver();
    saver.reset(emptyLoggedDay(DATE));

    const pending = saver.schedule(aDay({ flow: 3 }));
    const flushed = saver.flush();
    saver.reset(emptyLoggedDay(OTHER_DATE));

    expect((await flushed).status).toBe("saved");
    expect((await pending).status).toBe("saved");
    expect((await getDay(DATE))?.flow_intensity).toBe(3);
    expect(await getDay(OTHER_DATE)).toBeUndefined();
  });

  it("does not move the baseline onto a day that is no longer open", async () => {
    // The flush settled after reset, so the new day's baseline is the new
    // day's contents and an edit to it is still detected as a change.
    const saver = createLoggedDaySaver();
    saver.reset(emptyLoggedDay(DATE));

    saver.schedule(aDay({ flow: 3 }));
    const flushed = saver.flush();
    saver.reset(emptyLoggedDay(OTHER_DATE));
    await flushed;

    const next = saver.schedule(aDay({ date: OTHER_DATE, flow: 1 }));
    await settle();

    expect((await next).status).toBe("saved");
    expect((await getDay(OTHER_DATE))?.flow_intensity).toBe(1);
  });

  it("has nothing to flush when no write is pending", async () => {
    const saver = createLoggedDaySaver();
    saver.reset(emptyLoggedDay(DATE));

    expect((await saver.flush()).status).toBe("unchanged");
    expect(await getDay(DATE)).toBeUndefined();
  });

  it("reports a failure rather than throwing at the caller", async () => {
    const saver = createLoggedDaySaver();
    saver.reset(emptyLoggedDay(DATE));

    const outcome = saver.schedule(aDay({ date: DATE, flow: NaN }));
    await settle();

    expect(["saved", "failed"]).toContain((await outcome).status);
  });
});
