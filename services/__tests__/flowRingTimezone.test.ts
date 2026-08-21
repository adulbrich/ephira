import { flowRing } from "@/services/flowRing";
import type { DayData } from "@/constants/Interfaces";

/**
 * The month window, east of Greenwich.
 *
 * Its own file because the timezone has to be set before anything builds a
 * Date, and because a test that silently ran in UTC would prove nothing: the
 * defect it pins is invisible at offset zero. The first case asserts the
 * offset actually took, so this cannot pass for the wrong reason.
 *
 * Every Date here is built inside a test rather than at module scope, because
 * imports hoist above any assignment to `process.env.TZ` and a Date built at
 * module load would carry the old offset.
 */
const ORIGINAL_TZ = process.env.TZ;

beforeAll(() => {
  process.env.TZ = "Europe/Berlin";
});

afterAll(() => {
  process.env.TZ = ORIGINAL_TZ;
});

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
