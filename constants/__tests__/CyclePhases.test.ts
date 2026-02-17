import { CYCLE_PHASES, CyclePhaseId, getNextPhase } from "../CyclePhases";

describe("CyclePhases - Gradient Colors", () => {
  describe("Gradient Color Format Validation", () => {
    it("should have valid hex color format for all phase gradients", () => {
      Object.values(CYCLE_PHASES).forEach((phase) => {
        expect(phase.gradientColors).toBeDefined();
        expect(Array.isArray(phase.gradientColors)).toBe(true);
        expect(phase.gradientColors.length).toBe(3);

        phase.gradientColors.forEach((color, index) => {
          // Check if it's a valid hex color
          expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
          expect(typeof color).toBe("string");
        });
      });
    });

    it("should have gradient colors that match phase color theme", () => {
      Object.values(CYCLE_PHASES).forEach((phase) => {
        // The middle gradient color (index 1) should match the main phase color
        const middleColor = phase.gradientColors[1];
        expect(middleColor).toBe(phase.color);
      });
    });
  });

  describe("Phase-Specific Gradient Color Tests", () => {
    it("should have correct gradient colors for menstrual phase", () => {
      const phase = CYCLE_PHASES.menstrual;
      expect(phase.gradientColors).toEqual(["#990000", "#E62929", "#FF7272"]);
      expect(phase.gradientColors[1]).toBe(phase.color);
    });

    it("should have correct gradient colors for follicular phase", () => {
      const phase = CYCLE_PHASES.follicular;
      expect(phase.gradientColors).toEqual(["#E6B657", "#FFA770", "#FFD4B3"]);
      expect(phase.gradientColors[1]).toBe(phase.color);
    });

    it("should have correct gradient colors for ovulation phase", () => {
      const phase = CYCLE_PHASES.ovulation;
      expect(phase.gradientColors).toEqual(["#6B8F5E", "#88A87D", "#A8C99B"]);
      expect(phase.gradientColors[1]).toBe(phase.color);
    });

    it("should have correct gradient colors for luteal phase", () => {
      const phase = CYCLE_PHASES.luteal;
      expect(phase.gradientColors).toEqual(["#5A7AE6", "#809BFF", "#B3C4FF"]);
      expect(phase.gradientColors[1]).toBe(phase.color);
    });
  });

  describe("Gradient Color Progression", () => {
    it("should have logical color progression in gradients", () => {
      Object.values(CYCLE_PHASES).forEach((phase) => {
        const [start, middle, end] = phase.gradientColors;

        // Verify all colors are defined
        expect(start).toBeDefined();
        expect(middle).toBeDefined();
        expect(end).toBeDefined();

        // Middle should always match the main phase color
        expect(middle).toBe(phase.color);

        // Start and end should be different from middle (creating a gradient)
        expect(start).not.toBe(middle);
        expect(end).not.toBe(middle);
      });
    });

    it("should have unique gradient colors for each phase", () => {
      const phaseIds: CyclePhaseId[] = ["menstrual", "follicular", "ovulation", "luteal"];
      const gradients = phaseIds.map((id) => CYCLE_PHASES[id].gradientColors);

      // Each phase should have unique gradient colors
      for (let i = 0; i < gradients.length; i++) {
        for (let j = i + 1; j < gradients.length; j++) {
          expect(gradients[i]).not.toEqual(gradients[j]);
        }
      }
    });
  });

  describe("Gradient Color Consistency", () => {
    it("should maintain consistent gradient structure across all phases", () => {
      Object.values(CYCLE_PHASES).forEach((phase) => {
        expect(phase.gradientColors).toHaveLength(3);
        expect(phase.gradientColors[0]).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(phase.gradientColors[1]).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(phase.gradientColors[2]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it("should have gradient colors that are visually distinct", () => {
      Object.values(CYCLE_PHASES).forEach((phase) => {
        const [start, middle, end] = phase.gradientColors;

        // Colors should be different to create a visible gradient
        expect(start).not.toBe(middle);
        expect(end).not.toBe(middle);
        expect(start).not.toBe(end);
      });
    });
  });
});
