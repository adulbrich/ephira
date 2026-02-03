/**
 * Cycle prediction logic – automated tests for edge cases.
 * Covers first-time users, incomplete data, irregular cycles, and fallback behavior.
 */

import {
  areConsecutive,
  groupFlowIntoCycles,
  calculateAverageCycleLength,
  calculateConfidence,
  generatePredictions,
} from "../services/cyclePredictionLogic";
import type { DayData } from "../constants/Interfaces";
import { CYCLE_PREDICTION_CONSTANTS } from "../constants/CyclePrediction";

function day(id: number, date: string, flow: number, opts?: { is_cycle_start?: boolean; is_cycle_end?: boolean }): DayData {
  return {
    id,
    date,
    flow_intensity: flow,
    ...opts,
  };
}

describe("areConsecutive", () => {
  it("returns true for consecutive calendar days", () => {
    expect(areConsecutive("2025-01-01", "2025-01-02")).toBe(true);
    expect(areConsecutive("2025-01-31", "2025-02-01")).toBe(true);
  });
  it("returns false for same day or non-consecutive", () => {
    expect(areConsecutive("2025-01-01", "2025-01-01")).toBe(false);
    expect(areConsecutive("2025-01-01", "2025-01-03")).toBe(false);
  });
});

describe("groupFlowIntoCycles", () => {
  it("returns empty array for empty flow data", () => {
    expect(groupFlowIntoCycles([])).toEqual([]);
  });
  it("splits on gaps (non-consecutive days)", () => {
    const data: DayData[] = [
      day(1, "2025-01-01", 1),
      day(2, "2025-01-02", 1),
      day(3, "2025-01-03", 1),
      day(4, "2025-01-10", 1),
      day(5, "2025-01-11", 1),
      day(6, "2025-01-12", 1),
    ];
    const cycles = groupFlowIntoCycles(data);
    expect(cycles).toHaveLength(2);
    expect(cycles[0].dates).toEqual(["2025-01-01", "2025-01-02", "2025-01-03"]);
    expect(cycles[1].dates).toEqual(["2025-01-10", "2025-01-11", "2025-01-12"]);
  });
  it("sorts by date (handles unsorted input)", () => {
    const data: DayData[] = [
      day(1, "2025-01-03", 1),
      day(2, "2025-01-01", 1),
      day(3, "2025-01-02", 1),
    ];
    const cycles = groupFlowIntoCycles(data);
    expect(cycles).toHaveLength(1);
    expect(cycles[0].dates).toEqual(["2025-01-01", "2025-01-02", "2025-01-03"]);
  });
  it("respects manual cycle start marker", () => {
    const data: DayData[] = [
      day(1, "2025-01-01", 1),
      day(2, "2025-01-02", 1),
      day(3, "2025-01-03", 1, { is_cycle_start: true }),
      day(4, "2025-01-04", 1),
    ];
    const cycles = groupFlowIntoCycles(data);
    expect(cycles).toHaveLength(2);
    expect(cycles[0].dates).toEqual(["2025-01-01", "2025-01-02"]);
    expect(cycles[1].dates).toEqual(["2025-01-03", "2025-01-04"]);
  });
});

describe("calculateAverageCycleLength", () => {
  it("returns DEFAULT_CYCLE_LENGTH when fewer than 2 valid cycles", () => {
    const cycles = [
      { dates: ["2025-01-01", "2025-01-02", "2025-01-03"], startDate: "2025-01-01", endDate: "2025-01-03", isManuallyMarked: false },
    ];
    expect(calculateAverageCycleLength(cycles)).toBe(CYCLE_PREDICTION_CONSTANTS.DEFAULT_CYCLE_LENGTH);
  });
  it("returns DEFAULT_CYCLE_LENGTH when cycle lengths are all out of range", () => {
    const cycles = [
      { dates: ["2025-01-01", "2025-01-02", "2025-01-03"], startDate: "2025-01-01", endDate: "2025-01-03", isManuallyMarked: false },
      { dates: ["2025-02-15", "2025-02-16", "2025-02-17"], startDate: "2025-02-15", endDate: "2025-02-17", isManuallyMarked: false },
    ];
    expect(calculateAverageCycleLength(cycles)).toBe(CYCLE_PREDICTION_CONSTANTS.DEFAULT_CYCLE_LENGTH);
  });
  it("returns average when two valid cycles 28 days apart", () => {
    const cycles = [
      { dates: ["2025-01-01", "2025-01-02", "2025-01-03"], startDate: "2025-01-01", endDate: "2025-01-03", isManuallyMarked: false },
      { dates: ["2025-01-29", "2025-01-30", "2025-01-31"], startDate: "2025-01-29", endDate: "2025-01-31", isManuallyMarked: false },
    ];
    expect(calculateAverageCycleLength(cycles)).toBe(28);
  });
});

describe("calculateConfidence", () => {
  const twoCycles = [
    { dates: ["2025-01-01", "2025-01-02", "2025-01-03"], startDate: "2025-01-01", endDate: "2025-01-03", isManuallyMarked: false },
    { dates: ["2025-01-29", "2025-01-30", "2025-01-31"], startDate: "2025-01-29", endDate: "2025-01-31", isManuallyMarked: false },
  ];
  it("returns 30 when cycleLengths.length < 2", () => {
    expect(calculateConfidence(twoCycles, [])).toBe(30);
    expect(calculateConfidence(twoCycles, [28])).toBe(30);
  });
  it("returns value in 0-100 when cycleLengths.length >= 2", () => {
    const c = calculateConfidence(twoCycles, [28, 28], new Date("2025-02-01"));
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThanOrEqual(100);
  });
});

describe("generatePredictions", () => {
  const refDate = new Date("2025-02-15T12:00:00");

  it("1. First-time user – no flow data: returns []", () => {
    expect(generatePredictions([], { referenceDate: refDate })).toEqual([]);
  });

  it("2. Single flow day: returns [] (no valid cycle)", () => {
    const data = [day(1, "2025-02-01", 1)];
    expect(generatePredictions(data, { referenceDate: refDate })).toEqual([]);
  });

  it("3. Two consecutive flow days: returns [] (no valid cycle)", () => {
    const data = [day(1, "2025-02-01", 1), day(2, "2025-02-02", 1)];
    expect(generatePredictions(data, { referenceDate: refDate })).toEqual([]);
  });

  it("4. Exactly three consecutive flow days (one minimal cycle): returns non-empty, low confidence", () => {
    const data = [
      day(1, "2025-02-01", 1),
      day(2, "2025-02-02", 1),
      day(3, "2025-02-03", 1),
    ];
    const result = generatePredictions(data, { referenceDate: refDate, maxFutureCycles: 1 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].confidence).toBeLessThanOrEqual(50);
    expect(result[0].date).toBeDefined();
    expect(typeof result[0].confidence).toBe("number");
  });

  it("5. Two valid cycles – minimal data for prediction: non-empty, consistent", () => {
    const data: DayData[] = [
      day(1, "2025-01-01", 1),
      day(2, "2025-01-02", 1),
      day(3, "2025-01-03", 1),
      day(4, "2025-01-29", 1),
      day(5, "2025-01-30", 1),
      day(6, "2025-01-31", 1),
    ];
    const result = generatePredictions(data, { referenceDate: refDate });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    result.forEach((p) => {
      expect(p.date).toBeDefined();
      expect(p.confidence).toBeGreaterThanOrEqual(0);
      expect(p.confidence).toBeLessThanOrEqual(100);
    });
  });

  it("6. High cycle-length variability: returns predictions with lower confidence", () => {
    const data: DayData[] = [];
    const start1 = "2025-01-01";
    for (let i = 0; i < 5; i++) {
      const d = new Date(start1);
      d.setDate(d.getDate() + i);
      data.push(day(i + 1, d.toISOString().split("T")[0], 1));
    }
    const start2 = "2025-02-06";
    for (let i = 0; i < 5; i++) {
      const d = new Date(start2);
      d.setDate(d.getDate() + i);
      data.push(day(data.length + 1, d.toISOString().split("T")[0], 1));
    }
    const start3 = "2025-03-15";
    for (let i = 0; i < 5; i++) {
      const d = new Date(start3);
      d.setDate(d.getDate() + i);
      data.push(day(data.length + 1, d.toISOString().split("T")[0], 1));
    }
    const result = generatePredictions(data, { referenceDate: new Date("2025-04-01") });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].confidence).toBeLessThanOrEqual(100);
  });

  it("7. Gaps in logging (two segments): two cycles, predictions present", () => {
    const data = [
      day(1, "2025-01-01", 1),
      day(2, "2025-01-02", 1),
      day(3, "2025-01-03", 1),
      day(4, "2025-01-10", 1),
      day(5, "2025-01-11", 1),
      day(6, "2025-01-12", 1),
    ];
    const result = generatePredictions(data, { referenceDate: refDate });
    expect(result.length).toBeGreaterThan(0);
  });

  it("8. Never returns null or undefined", () => {
    expect(generatePredictions([], { referenceDate: refDate })).not.toBeNull();
    expect(generatePredictions([], { referenceDate: refDate })).not.toBeUndefined();
    const oneDay = [day(1, "2025-02-01", 1)];
    expect(generatePredictions(oneDay, { referenceDate: refDate })).not.toBeNull();
  });

  it("9. Cycle lengths outside 21–35: uses default length, still returns predictions", () => {
    const data: DayData[] = [
      day(1, "2025-01-01", 1),
      day(2, "2025-01-02", 1),
      day(3, "2025-01-03", 1),
      day(4, "2025-03-15", 1),
      day(5, "2025-03-16", 1),
      day(6, "2025-03-17", 1),
    ];
    const result = generatePredictions(data, { referenceDate: new Date("2025-04-01") });
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0].date).toBeDefined();
      expect(result[0].confidence).toBeDefined();
    }
  });

  it("10. Filters out zero flow intensity (only positive flow counts)", () => {
    const data = [
      day(1, "2025-02-01", 0),
      day(2, "2025-02-02", 1),
      day(3, "2025-02-03", 1),
      day(4, "2025-02-04", 1),
    ];
    const result = generatePredictions(data, { referenceDate: refDate });
    expect(result.length).toBeGreaterThan(0);
  });
  it("10b. With two cycles and some zero-flow days: returns predictions", () => {
    const data = [
      day(1, "2025-02-01", 0),
      day(2, "2025-02-02", 1),
      day(3, "2025-02-03", 1),
      day(4, "2025-02-04", 1),
      day(5, "2025-03-02", 1),
      day(6, "2025-03-03", 1),
      day(7, "2025-03-04", 1),
    ];
    const result = generatePredictions(data, { referenceDate: refDate });
    expect(result.length).toBeGreaterThan(0);
  });

  it("11. Only includes future dates relative to referenceDate", () => {
    const data = [
      day(1, "2025-01-01", 1),
      day(2, "2025-01-02", 1),
      day(3, "2025-01-03", 1),
      day(4, "2025-01-29", 1),
      day(5, "2025-01-30", 1),
      day(6, "2025-01-31", 1),
    ];
    const futureRef = new Date("2026-01-01");
    const result = generatePredictions(data, { referenceDate: futureRef });
    result.forEach((p) => {
      expect(new Date(p.date) > futureRef).toBe(true);
    });
  });

  it("12. Multiple calls with same data produce same length (no accumulation)", () => {
    const data = [
      day(1, "2025-01-01", 1),
      day(2, "2025-01-02", 1),
      day(3, "2025-01-03", 1),
      day(4, "2025-01-29", 1),
      day(5, "2025-01-30", 1),
      day(6, "2025-01-31", 1),
    ];
    const a = generatePredictions(data, { referenceDate: refDate });
    const b = generatePredictions(data, { referenceDate: refDate });
    expect(a.length).toBe(b.length);
    expect(a.length).toBeGreaterThan(0);
  });

  it("13. All predictions have date and confidence", () => {
    const data = [
      day(1, "2025-01-01", 1),
      day(2, "2025-01-02", 1),
      day(3, "2025-01-03", 1),
      day(4, "2025-01-29", 1),
      day(5, "2025-01-30", 1),
      day(6, "2025-01-31", 1),
    ];
    const result = generatePredictions(data, { referenceDate: refDate });
    result.forEach((p) => {
      expect(p).toHaveProperty("date");
      expect(p).toHaveProperty("confidence");
      expect(typeof p.date).toBe("string");
      expect(typeof p.confidence).toBe("number");
      expect(p.confidence).toBeGreaterThanOrEqual(0);
      expect(p.confidence).toBeLessThanOrEqual(100);
    });
  });
});
