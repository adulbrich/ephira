import React from "react";
import { render } from "@testing-library/react-native";
import { CYCLE_PHASES, CyclePhaseId } from "@/constants/CyclePhases";
import HomeScreen from "../index";
import { useCyclePhase } from "@/hooks/useCyclePhase";
import { useData, usePredictedCycle, useDatabaseChangeNotifier } from "@/assets/src/calendar-storage";
import { useFetchCycleData } from "@/hooks/useFetchCycleData";

// Mock dependencies
jest.mock("@/hooks/useCyclePhase");
jest.mock("@/assets/src/calendar-storage");
jest.mock("@/hooks/useFetchCycleData");
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));
jest.mock("react-native-paper", () => {
  const actual = jest.requireActual("react-native-paper");
  return {
    ...actual,
    useTheme: () => ({
      colors: {
        background: "#ffffff",
        primary: "#6200ee",
        secondary: "#03dac6",
        onPrimary: "#ffffff",
        onSecondary: "#000000",
        surface: "#ffffff",
        onSurface: "#000000",
        secondaryContainer: "#f5f5f5",
        onSecondaryContainer: "#000000",
      },
    }),
  };
});
jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return {
    LinearGradient: ({ children, colors, style, ...props }: any) => (
      <View style={[{ backgroundColor: colors[0] }, style]} {...props}>
        {children}
      </View>
    ),
  };
});

describe("HomeScreen - Phase Button Gradient", () => {
  const mockFlowData = [];
  const mockPredictedCycle = [];
  const mockSetPredictedCycle = jest.fn();
  const mockFetchCycleData = jest.fn();
  const mockSetDatabaseChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useData as jest.Mock).mockReturnValue({ data: mockFlowData });
    (usePredictedCycle as jest.Mock).mockReturnValue({
      predictedCycle: mockPredictedCycle,
      setPredictedCycle: mockSetPredictedCycle,
    });
    (useDatabaseChangeNotifier as jest.Mock).mockReturnValue({
      databaseChange: null,
      setDatabaseChange: mockSetDatabaseChange,
    });
    (useFetchCycleData as jest.Mock).mockReturnValue({
      fetchCycleData: mockFetchCycleData,
    });
  });

  describe("Gradient Colors for Each Phase", () => {
    const phases: CyclePhaseId[] = ["menstrual", "follicular", "ovulation", "luteal"];

    phases.forEach((phaseId) => {
      it(`should use correct gradient colors for ${phaseId} phase`, () => {
        const phase = CYCLE_PHASES[phaseId];
        const mockCycleState = {
          currentPhase: phaseId,
          cycleDay: 5,
          cycleLength: 28,
          daysUntilNextPeriod: 23,
          lastPeriodStart: "2024-01-01",
          nextPredictedStart: null,
          confidence: 50,
          hasEnoughData: false,
        };

        (useCyclePhase as jest.Mock).mockReturnValue({
          cycleState: mockCycleState,
          stats: null,
          loading: false,
          refresh: jest.fn(),
        });

        const { getByText } = render(<HomeScreen />);
        const phaseButton = getByText(`You're in your ${phase.name} phase`);

        expect(phaseButton).toBeTruthy();
        expect(phase.gradientColors).toBeDefined();
        expect(phase.gradientColors.length).toBe(3);
      });
    });
  });

  describe("Gradient Color Validation", () => {
    it("should have valid hex color format for all phase gradients", () => {
      Object.values(CYCLE_PHASES).forEach((phase) => {
        expect(phase.gradientColors).toBeDefined();
        expect(Array.isArray(phase.gradientColors)).toBe(true);
        expect(phase.gradientColors.length).toBe(3);

        phase.gradientColors.forEach((color) => {
          // Check if it's a valid hex color
          expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
      });
    });

    it("should have gradient colors that match phase color theme", () => {
      Object.values(CYCLE_PHASES).forEach((phase) => {
        // The middle gradient color should be close to the main phase color
        const middleColor = phase.gradientColors[1];
        expect(middleColor).toBe(phase.color);
      });
    });
  });

  describe("Gradient Rendering", () => {
    it("should render phase button with gradient when phase data is available", () => {
      const mockCycleState = {
        currentPhase: "luteal" as CyclePhaseId,
        cycleDay: 20,
        cycleLength: 28,
        daysUntilNextPeriod: 8,
        lastPeriodStart: "2024-01-01",
        nextPredictedStart: null,
        confidence: 50,
        hasEnoughData: false,
      };

      (useCyclePhase as jest.Mock).mockReturnValue({
        cycleState: mockCycleState,
        stats: null,
        loading: false,
        refresh: jest.fn(),
      });

      const { getByText } = render(<HomeScreen />);
      const phaseText = getByText("You're in your Luteal phase");
      expect(phaseText).toBeTruthy();
    });

    it("should not render phase button when phase data is not available", () => {
      (useCyclePhase as jest.Mock).mockReturnValue({
        cycleState: null,
        stats: null,
        loading: false,
        refresh: jest.fn(),
      });

      const { queryByText } = render(<HomeScreen />);
      const phaseButton = queryByText(/You're in your/);
      expect(phaseButton).toBeNull();
    });
  });

  describe("Gradient Color Transitions", () => {
    it("should have smooth color transitions in gradient arrays", () => {
      Object.values(CYCLE_PHASES).forEach((phase) => {
        const [start, middle, end] = phase.gradientColors;

        // Verify gradient progression: start -> middle -> end
        expect(start).toBeDefined();
        expect(middle).toBe(phase.color); // Middle should match main color
        expect(end).toBeDefined();

        // All colors should be valid hex codes
        [start, middle, end].forEach((color) => {
          expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
      });
    });
  });

  describe("Phase-Specific Gradient Tests", () => {
    it("should have correct gradient for menstrual phase", () => {
      const phase = CYCLE_PHASES.menstrual;
      expect(phase.gradientColors).toEqual(["#990000", "#E62929", "#FF7272"]);
    });

    it("should have correct gradient for follicular phase", () => {
      const phase = CYCLE_PHASES.follicular;
      expect(phase.gradientColors).toEqual(["#E6B657", "#FFA770", "#FFD4B3"]);
    });

    it("should have correct gradient for ovulation phase", () => {
      const phase = CYCLE_PHASES.ovulation;
      expect(phase.gradientColors).toEqual(["#6B8F5E", "#88A87D", "#A8C99B"]);
    });

    it("should have correct gradient for luteal phase", () => {
      const phase = CYCLE_PHASES.luteal;
      expect(phase.gradientColors).toEqual(["#5A7AE6", "#809BFF", "#B3C4FF"]);
    });
  });
});
