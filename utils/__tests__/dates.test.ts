import { addDays, differenceInDays, formatAsISODate } from "@/utils/dates";

const day = (iso: string) => {
  const [year, month, date] = iso.split("-").map(Number);
  return new Date(year, month - 1, date);
};

describe("differenceInDays", () => {
  it("counts calendar days", () => {
    expect(differenceInDays(day("2026-03-01"), day("2026-03-08"))).toBe(7);
  });

  it("is not thrown off by a daylight saving transition", () => {
    // Raw millisecond division floors this to 83 in any timezone that springs
    // forward in March, which is most of the ones users are in.
    expect(differenceInDays(day("2026-03-01"), day("2026-05-24"))).toBe(84);
    expect(differenceInDays(day("2026-11-01"), day("2026-11-30"))).toBe(29);
  });

  it("goes negative in the other direction", () => {
    expect(differenceInDays(day("2026-03-08"), day("2026-03-01"))).toBe(-7);
  });
});

describe("formatAsISODate", () => {
  it("formats in local time, not UTC", () => {
    // 23:30 local on the 1st is the 2nd in UTC anywhere east of it. The app
    // stores and compares calendar days, so local is the right answer.
    expect(formatAsISODate(new Date(2026, 2, 1, 23, 30))).toBe("2026-03-01");
  });

  it("pads single-digit months and days", () => {
    expect(formatAsISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("addDays", () => {
  it("moves by calendar days across a daylight saving transition", () => {
    expect(formatAsISODate(addDays(day("2026-03-07"), 2))).toBe("2026-03-09");
  });

  it("goes backwards", () => {
    expect(formatAsISODate(addDays(day("2026-01-01"), -1))).toBe("2025-12-31");
  });
});
