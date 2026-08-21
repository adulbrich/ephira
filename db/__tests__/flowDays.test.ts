import { loadFlowDays, normaliseFlowDays } from "@/db/flowDays";
import { insertDay } from "@/db/operations/days";
import { resetTestDatabase } from "@/__tests__/helpers/testDatabase";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

const CHECKED_ON = new Date(2026, 2, 15);

beforeEach(() => {
  resetTestDatabase();
});

describe("normaliseFlowDays", () => {
  it("drops a Day with no flow", () => {
    const days = normaliseFlowDays([
      { id: 1, date: "2026-01-01", flow_intensity: 3 },
      { id: 2, date: "2026-01-02", flow_intensity: 0 },
      { id: 3, date: "2026-01-03", flow_intensity: null },
    ]);

    expect(days.map((day) => day.date)).toEqual(["2026-01-01"]);
  });

  it("resolves the nullable columns the cycle rules read", () => {
    const [day] = normaliseFlowDays([
      {
        id: 1,
        date: "2026-01-01",
        flow_intensity: 2,
        is_cycle_start: null,
        is_cycle_end: null,
        notes: null,
      },
    ]);

    expect(day.is_cycle_start).toBeUndefined();
    expect(day.is_cycle_end).toBeUndefined();
    expect(day.notes).toBeUndefined();
    expect(day.flow_intensity).toBe(2);
  });

  it("keeps the markers a user set", () => {
    const [day] = normaliseFlowDays([
      {
        id: 1,
        date: "2026-01-01",
        flow_intensity: 2,
        is_cycle_start: true,
        is_cycle_end: false,
      },
    ]);

    expect(day.is_cycle_start).toBe(true);
    expect(day.is_cycle_end).toBe(false);
  });

  it("sorts oldest first, whatever order it was given", () => {
    const days = normaliseFlowDays([
      { id: 1, date: "2026-01-10", flow_intensity: 3 },
      { id: 2, date: "2026-01-02", flow_intensity: 3 },
      { id: 3, date: "2026-01-31", flow_intensity: 3 },
    ]);

    expect(days.map((day) => day.date)).toEqual([
      "2026-01-02",
      "2026-01-10",
      "2026-01-31",
    ]);
  });
});

describe("loadFlowDays", () => {
  it("returns nothing when no flow has been logged", async () => {
    await insertDay("2026-01-01", 0, CHECKED_ON);

    expect(await loadFlowDays()).toEqual([]);
  });

  it("returns the logged flow Days, oldest first", async () => {
    await insertDay("2026-01-03", 2, CHECKED_ON);
    await insertDay("2026-01-01", 3, CHECKED_ON);
    await insertDay("2026-01-02", 0, CHECKED_ON);

    expect((await loadFlowDays()).map((day) => day.date)).toEqual([
      "2026-01-01",
      "2026-01-03",
    ]);
  });
});
