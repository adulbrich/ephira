/**
 * Cycle phase definitions, colors, descriptions, symptoms, and wellness tips
 */

export type CyclePhaseId = "menstrual" | "follicular" | "ovulation" | "luteal";

export interface CyclePhaseDefinition {
  id: CyclePhaseId;
  name: string;
  shortDescription: string;
  color: string;
  gradientColors: [string, string, string];
  typicalDays: {
    start: number;
    end: number;
  };
  bodyDescription: string;
  commonSymptoms: string[];
  hormoneInfo: string;
  wellnessTips: string[];
  learnMoreUrl: string;
}

export const CYCLE_PHASES: Record<CyclePhaseId, CyclePhaseDefinition> = {
  menstrual: {
    id: "menstrual",
    name: "Menstrual",
    shortDescription: "Days 1-5: Your period",
    color: "#E62929",
    gradientColors: ["#990000", "#E62929", "#FF7272"],
    typicalDays: { start: 1, end: 5 },
    bodyDescription:
      "The uterine lining is being shed. Estrogen and progesterone are at their lowest levels, which triggers menstruation.",
    commonSymptoms: [
      "Cramps",
      "Fatigue",
      "Bloating",
      "Mood changes",
      "Lower back pain",
    ],
    hormoneInfo:
      "Estrogen and progesterone drop to their lowest levels, triggering the shedding of the uterine lining. This hormonal shift can affect energy and mood.",
    wellnessTips: [
      "Stay hydrated and eat iron-rich foods to replenish what you lose",
      "Gentle exercise like yoga or walking can help ease cramps",
      "Prioritize rest and quality sleep during this time",
    ],
    learnMoreUrl:
      "https://my.clevelandclinic.org/health/articles/10132-menstrual-cycle",
  },
  follicular: {
    id: "follicular",
    name: "Follicular",
    shortDescription: "Days 6-13: Building up",
    color: "#FFA770",
    gradientColors: ["#E6B657", "#FFA770", "#FFD4B3"],
    typicalDays: { start: 6, end: 13 },
    bodyDescription:
      "Follicles in the ovaries begin to develop. One egg matures while estrogen rises, preparing the body for ovulation.",
    commonSymptoms: [
      "Increased energy",
      "Improved mood",
      "Clearer skin",
      "Higher libido",
      "Better focus",
    ],
    hormoneInfo:
      "FSH (follicle-stimulating hormone) stimulates follicle growth. Estrogen begins rising steadily, which often improves mood, energy, and cognitive function.",
    wellnessTips: [
      "Great time for high-intensity workouts and challenging exercises",
      "Start new projects - your energy and focus are typically at their best",
      "Social activities and networking feel easier during this phase",
    ],
    learnMoreUrl:
      "https://my.clevelandclinic.org/health/body/23953-follicular-phase",
  },
  ovulation: {
    id: "ovulation",
    name: "Ovulation",
    shortDescription: "Days 14-16: Peak fertility",
    color: "#88A87D",
    gradientColors: ["#6B8F5E", "#88A87D", "#A8C99B"],
    typicalDays: { start: 14, end: 16 },
    bodyDescription:
      "An egg is released from the ovary and travels down the fallopian tube. This is your most fertile window of the cycle.",
    commonSymptoms: [
      "Slight temperature rise",
      "Cervical mucus changes",
      "Mild cramping (mittelschmerz)",
      "Increased energy",
      "Heightened senses",
    ],
    hormoneInfo:
      "LH (luteinizing hormone) surges, triggering egg release. Estrogen peaks then drops. Testosterone also peaks briefly, which can increase energy and libido.",
    wellnessTips: [
      "Peak energy phase - ideal for your most challenging workouts",
      "Be aware of your fertility window if relevant to your goals",
      "Great time for important conversations and presentations",
    ],
    learnMoreUrl:
      "https://my.clevelandclinic.org/health/articles/23439-ovulation",
  },
  luteal: {
    id: "luteal",
    name: "Luteal",
    shortDescription: "Days 17-28: Pre-menstrual",
    color: "#809BFF",
    gradientColors: ["#5A7AE6", "#809BFF", "#B3C4FF"],
    typicalDays: { start: 17, end: 28 },
    bodyDescription:
      "The body prepares for potential pregnancy. The corpus luteum produces progesterone. If no pregnancy occurs, hormone levels drop, leading to menstruation.",
    commonSymptoms: [
      "PMS symptoms",
      "Bloating",
      "Breast tenderness",
      "Mood changes",
      "Food cravings",
    ],
    hormoneInfo:
      "Progesterone rises to its peak then falls if pregnancy doesn't occur. This hormonal shift can cause PMS symptoms in the days before your period.",
    wellnessTips: [
      "Switch to lower-intensity exercise like swimming, pilates, or gentle yoga",
      "Prioritize sleep and stress management techniques",
      "Complex carbs and magnesium-rich foods may help manage cravings",
    ],
    learnMoreUrl:
      "https://my.clevelandclinic.org/health/articles/24417-luteal-phase",
  },
};

/**
 * Get the next phase in the cycle
 */
export function getNextPhase(currentPhase: CyclePhaseId): CyclePhaseId {
  const order: CyclePhaseId[] = [
    "menstrual",
    "follicular",
    "ovulation",
    "luteal",
  ];
  const currentIndex = order.indexOf(currentPhase);
  const nextIndex = (currentIndex + 1) % order.length;
  return order[nextIndex];
}

/**
 * Get phase boundaries adjusted for a specific cycle length
 */
export function getAdjustedPhaseBoundaries(cycleLength: number): {
  menstrualEnd: number;
  follicularEnd: number;
  ovulationEnd: number;
} {
  return {
    menstrualEnd: 5,
    follicularEnd: Math.round(cycleLength * 0.46),
    ovulationEnd: Math.round(cycleLength * 0.57),
  };
}
