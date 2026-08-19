import { getPregnancyWeekContent } from "@/constants/Pregnancy";
import { PREGNANCY_WEEK_CONTENT } from "@/data/pregnancyWeeks";

describe("getPregnancyWeekContent", () => {
  it("covers all forty weeks", () => {
    expect(Object.keys(PREGNANCY_WEEK_CONTENT)).toHaveLength(40);
  });

  it("returns the content for a week in range", () => {
    expect(getPregnancyWeekContent(12)).toBe(PREGNANCY_WEEK_CONTENT[12]);
  });

  it("returns week 1 at the lower boundary", () => {
    expect(getPregnancyWeekContent(1)).toBe(PREGNANCY_WEEK_CONTENT[1]);
  });

  it("returns week 40 at the upper boundary", () => {
    expect(getPregnancyWeekContent(40)).toBe(PREGNANCY_WEEK_CONTENT[40]);
  });

  it("clamps past week 40 rather than going blank", () => {
    // A pregnancy can run past its due date, and that is exactly when this
    // screen is most likely to be read.
    expect(getPregnancyWeekContent(41)).toBe(PREGNANCY_WEEK_CONTENT[40]);
    expect(getPregnancyWeekContent(52)).toBe(PREGNANCY_WEEK_CONTENT[40]);
  });

  it("clamps below week 1", () => {
    expect(getPregnancyWeekContent(0)).toBe(PREGNANCY_WEEK_CONTENT[1]);
    expect(getPregnancyWeekContent(-3)).toBe(PREGNANCY_WEEK_CONTENT[1]);
  });

  it("has something to say for every week", () => {
    for (let week = 1; week <= 40; week++) {
      const content = getPregnancyWeekContent(week);

      expect(content.babyDevelopment.length).toBeGreaterThan(0);
      expect(content.commonSymptoms.length).toBeGreaterThan(0);
      expect(content.tips.length).toBeGreaterThan(0);
    }
  });
});
