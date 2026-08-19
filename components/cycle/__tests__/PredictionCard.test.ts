import { upcomingWeek } from "@/components/cycle/PredictionCard";

// The card renders react-native-paper; the day arithmetic does not.
jest.mock("@/db/operations/setup", () => ({
  getDatabase: jest.fn(),
  getDrizzleDatabase: jest.fn(),
}));

describe("upcomingWeek", () => {
  it("returns seven days starting at the reference day", () => {
    const week = upcomingWeek(new Date(2026, 4, 4, 9, 0));

    expect(week).toHaveLength(7);
    expect(week.map((d) => d.dateStr)).toEqual([
      "2026-05-04",
      "2026-05-05",
      "2026-05-06",
      "2026-05-07",
      "2026-05-08",
      "2026-05-09",
      "2026-05-10",
    ]);
  });

  it("dates the strip by the local calendar day, not by UTC", () => {
    // Half past midnight local is the *previous* day in UTC for anyone east
    // of it. Formatting with toISOString labelled the whole strip a day early
    // for those users, and matched predictions to the wrong column.
    expect(upcomingWeek(new Date(2026, 4, 2, 0, 30))[0].dateStr).toBe(
      "2026-05-02",
    );

    // And half past eleven at night is the *next* day in UTC for anyone west
    // of it. Both directions, so this test fails in some timezone if the
    // implementation ever goes back to UTC.
    expect(upcomingWeek(new Date(2026, 4, 1, 23, 30))[0].dateStr).toBe(
      "2026-05-01",
    );
  });

  it("carries the day number that matches its date string", () => {
    for (const day of upcomingWeek(new Date(2026, 4, 4))) {
      expect(day.dayNum).toBe(Number(day.dateStr.split("-")[2]));
    }
  });

  it("crosses a month boundary", () => {
    expect(upcomingWeek(new Date(2026, 4, 29)).map((d) => d.dateStr)).toEqual([
      "2026-05-29",
      "2026-05-30",
      "2026-05-31",
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
    ]);
  });

  it("stays on calendar days across a daylight saving transition", () => {
    // Spring forward is 2026-03-29 in Europe, 2026-03-08 in the US. A
    // millisecond-based step lands on the wrong day for one of them.
    const march = upcomingWeek(new Date(2026, 2, 6)).map((d) => d.dateStr);
    expect(march[2]).toBe("2026-03-08");
    expect(march[6]).toBe("2026-03-12");

    const late = upcomingWeek(new Date(2026, 2, 27)).map((d) => d.dateStr);
    expect(late[2]).toBe("2026-03-29");
    expect(late[6]).toBe("2026-04-02");
  });

  it("gives each day a single-letter weekday", () => {
    for (const day of upcomingWeek(new Date(2026, 4, 4))) {
      expect(day.weekday).toHaveLength(1);
    }
  });
});
