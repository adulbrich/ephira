import { flowRing } from "@/services/flowRing";
import type { DayData } from "@/constants/Interfaces";

/**
 * The month window, east of Greenwich.
 *
 * The timezone is pinned for the whole suite in `jest.globalSetup.js`, which
 * runs before any worker spawns. Setting `process.env.TZ` from inside this file
 * does not work: on Linux the zone is already cached by the time `beforeAll`
 * runs, so the assignment is ignored and these cases pass vacuously in UTC --
 * which is exactly what happened on CI before the guard below caught it.
 *
 * The first case asserts the offset actually took, so this file cannot pass for
 * the wrong reason. The defect it pins is invisible at offset zero.
 */

let nextId = 1;
const day = (date: string, flow_intensity = 3): DayData => ({
  id: nextId++,
  date,
  flow_intensity,
});

/** August 2026, mid-month. Local midnight here is 22:00 UTC the day before. */
const referenceDay = () => new Date(2026, 7, 15);

describe("the reference month, in a zone ahead of UTC", () => {
  it("is actually running east of Greenwich, or the rest proves nothing", () => {
    expect(new Date(2026, 7, 1).toISOString()).toBe("2026-07-31T22:00:00.000Z");
  });

  it("includes a Day on the last calendar day of the month", () => {
    // Excluded before the fix: the window's upper bound formatted as UTC came
    // back 2026-08-30, so the 31st fell outside it.
    const ring = flowRing([day("2026-08-31")], referenceDay());

    expect(ring.monthDays.map((d) => d.date)).toEqual(["2026-08-31"]);
  });

  it("excludes a Day on the last calendar day of the previous month", () => {
    // Included before the fix: the lower bound came back 2026-07-31.
    const ring = flowRing([day("2026-07-31")], referenceDay());

    expect(ring.monthDays).toEqual([]);
  });

  it("keeps the first day of the month", () => {
    const ring = flowRing([day("2026-08-01")], referenceDay());

    expect(ring.monthDays.map((d) => d.date)).toEqual(["2026-08-01"]);
  });

  it("counts the whole month and nothing either side", () => {
    const ring = flowRing(
      [
        day("2026-07-31"),
        day("2026-08-01"),
        day("2026-08-15"),
        day("2026-08-31"),
        day("2026-09-01"),
      ],
      referenceDay(),
    );

    expect(ring.monthDays.map((d) => d.date)).toEqual([
      "2026-08-01",
      "2026-08-15",
      "2026-08-31",
    ]);
    expect(ring.flowDayCount).toBe(3);
  });
});
