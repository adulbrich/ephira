import { FlowType } from "@/constants/Colors";
import { FlowColors } from "@/constants/Colors";
import {
  getFlowTypeString,
  FLOW_TAIL_COLOR,
} from "@/constants/Flow";

/**
 * Test helper: Extract gradient logic from FlowChart component
 * This mirrors the gradient generation logic in FlowChart.tsx
 */
function generateGradientStops(flowDataForCurrentMonth: any[]): {
  stops: Array<{ offset: string; color: string }>;
  flowStatesInOrder: FlowType[];
} {
  // Get unique flow states in chronological order
  const flowStatesInOrder: FlowType[] = [];
  
  if (flowDataForCurrentMonth.length === 0) {
    return {
      stops: [
        { offset: "0%", color: FlowColors.spotting },
        { offset: "90%", color: FlowColors.heavy },
        { offset: "95%", color: FLOW_TAIL_COLOR },
      ],
      flowStatesInOrder: [],
    };
  }

  // Sort by date to get chronological order
  const sortedData = [...flowDataForCurrentMonth].sort((a, b) => {
    const dateA = new Date(a.date + "T00:00:00Z").getTime();
    const dateB = new Date(b.date + "T00:00:00Z").getTime();
    return dateA - dateB;
  });

  // Extract unique flow types in order of first appearance
  const seen = new Set<FlowType>();
  const uniqueFlowTypes: FlowType[] = [];

  for (const data of sortedData) {
    // Skip "None" (flow_intensity 0) - it should not affect the gradient
    if (!data.flow_intensity || data.flow_intensity === 0) {
      continue;
    }
    const flowType = getFlowTypeString(data.flow_intensity);
    if (flowType && !seen.has(flowType)) {
      seen.add(flowType);
      uniqueFlowTypes.push(flowType);
    }
  }

  const maxOffset = 90; // Leave room for tail fade
  const stops: Array<{ offset: string; color: string }> = [];

  if (uniqueFlowTypes.length === 0) {
    // Default gradient if no flow data
    stops.push(
      { offset: "0%", color: FlowColors.spotting },
      { offset: `${maxOffset}%`, color: FlowColors.heavy }
    );
  } else if (uniqueFlowTypes.length === 1) {
    // Single flow state - solid color
    const color = FlowColors[uniqueFlowTypes[0]];
    stops.push(
      { offset: "0%", color: color },
      { offset: `${maxOffset}%`, color: color }
    );
  } else {
    // Multiple flow states - create gradient with proportional stops
    uniqueFlowTypes.forEach((flowType, index) => {
      const offset = (index / (uniqueFlowTypes.length - 1)) * maxOffset;
      const color = FlowColors[flowType];
      stops.push({ offset: `${offset}%`, color: color });
    });
  }

  // Add tail fade stop at 95% to create smooth transition to purple
  stops.push({ offset: "95%", color: FLOW_TAIL_COLOR });

  return { stops, flowStatesInOrder: uniqueFlowTypes };
}

describe("FlowChart Gradient Generation", () => {
  describe("No Flow Data", () => {
    it("should generate default gradient when no flow data exists", () => {
      const { stops, flowStatesInOrder } = generateGradientStops([]);

      expect(flowStatesInOrder).toHaveLength(0);
      expect(stops).toHaveLength(3);
      expect(stops[0]).toEqual({ offset: "0%", color: FlowColors.spotting });
      expect(stops[1]).toEqual({ offset: "90%", color: FlowColors.heavy });
      expect(stops[2]).toEqual({ offset: "95%", color: FLOW_TAIL_COLOR });
    });

    it("should generate default gradient when flow data array is empty", () => {
      const { stops } = generateGradientStops([]);
      
      expect(stops[0].color).toBe(FlowColors.spotting);
      expect(stops[1].color).toBe(FlowColors.heavy);
      expect(stops[2].color).toBe(FLOW_TAIL_COLOR);
    });
  });

  describe("Single Flow Type", () => {
    it("should generate solid color gradient for single flow type (spotting)", () => {
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: 1 },
        { date: "2024-01-16T00:00:00Z", flow_intensity: 1 },
      ];

      const { stops, flowStatesInOrder } = generateGradientStops(flowData);

      expect(flowStatesInOrder).toEqual(["spotting"]);
      expect(stops).toHaveLength(3);
      expect(stops[0]).toEqual({ offset: "0%", color: FlowColors.spotting });
      expect(stops[1]).toEqual({ offset: "90%", color: FlowColors.spotting });
      expect(stops[2]).toEqual({ offset: "95%", color: FLOW_TAIL_COLOR });
    });

    it("should generate solid color gradient for single flow type (light)", () => {
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: 2 },
        { date: "2024-01-16T00:00:00Z", flow_intensity: 2 },
      ];

      const { stops, flowStatesInOrder } = generateGradientStops(flowData);

      expect(flowStatesInOrder).toEqual(["light"]);
      expect(stops[0].color).toBe(FlowColors.light);
      expect(stops[1].color).toBe(FlowColors.light);
    });

    it("should generate solid color gradient for single flow type (medium)", () => {
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: 3 },
      ];

      const { stops, flowStatesInOrder } = generateGradientStops(flowData);

      expect(flowStatesInOrder).toEqual(["medium"]);
      expect(stops[0].color).toBe(FlowColors.medium);
      expect(stops[1].color).toBe(FlowColors.medium);
    });

    it("should generate solid color gradient for single flow type (heavy)", () => {
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: 4 },
      ];

      const { stops, flowStatesInOrder } = generateGradientStops(flowData);

      expect(flowStatesInOrder).toEqual(["heavy"]);
      expect(stops[0].color).toBe(FlowColors.heavy);
      expect(stops[1].color).toBe(FlowColors.heavy);
    });
  });

  describe("Multiple Flow Types - Chronological Order", () => {
    it("should generate gradient in chronological order (spotting -> light)", () => {
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: 1 }, // spotting
        { date: "2024-01-16T00:00:00Z", flow_intensity: 2 }, // light
      ];

      const { stops, flowStatesInOrder } = generateGradientStops(flowData);

      expect(flowStatesInOrder).toEqual(["spotting", "light"]);
      expect(stops).toHaveLength(3);
      expect(stops[0]).toEqual({ offset: "0%", color: FlowColors.spotting });
      expect(stops[1]).toEqual({ offset: "90%", color: FlowColors.light });
      expect(stops[2]).toEqual({ offset: "95%", color: FLOW_TAIL_COLOR });
    });

    it("should generate gradient in chronological order (light -> medium -> heavy)", () => {
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: 2 }, // light
        { date: "2024-01-16T00:00:00Z", flow_intensity: 3 }, // medium
        { date: "2024-01-17T00:00:00Z", flow_intensity: 4 }, // heavy
      ];

      const { stops, flowStatesInOrder } = generateGradientStops(flowData);

      expect(flowStatesInOrder).toEqual(["light", "medium", "heavy"]);
      expect(stops).toHaveLength(4);
      expect(stops[0]).toEqual({ offset: "0%", color: FlowColors.light });
      expect(stops[1]).toEqual({ offset: "45%", color: FlowColors.medium });
      expect(stops[2]).toEqual({ offset: "90%", color: FlowColors.heavy });
      expect(stops[3]).toEqual({ offset: "95%", color: FLOW_TAIL_COLOR });
    });

    it("should maintain chronological order even when data is unsorted", () => {
      const flowData = [
        { date: "2024-01-17T00:00:00Z", flow_intensity: 4 }, // heavy (later)
        { date: "2024-01-15T00:00:00Z", flow_intensity: 2 }, // light (earlier)
        { date: "2024-01-16T00:00:00Z", flow_intensity: 3 }, // medium (middle)
      ];

      const { flowStatesInOrder } = generateGradientStops(flowData);

      // Should be sorted chronologically
      expect(flowStatesInOrder).toEqual(["light", "medium", "heavy"]);
    });
  });

  describe("Flow Type Deduplication", () => {
    it("should only include unique flow types in chronological order", () => {
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: 1 }, // spotting
        { date: "2024-01-16T00:00:00Z", flow_intensity: 1 }, // spotting (duplicate)
        { date: "2024-01-17T00:00:00Z", flow_intensity: 2 }, // light
        { date: "2024-01-18T00:00:00Z", flow_intensity: 1 }, // spotting (duplicate, but already seen)
      ];

      const { flowStatesInOrder } = generateGradientStops(flowData);

      // Should only include first occurrence of each type
      expect(flowStatesInOrder).toEqual(["spotting", "light"]);
    });

    it("should handle multiple occurrences of same flow type", () => {
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: 2 },
        { date: "2024-01-16T00:00:00Z", flow_intensity: 2 },
        { date: "2024-01-17T00:00:00Z", flow_intensity: 2 },
        { date: "2024-01-18T00:00:00Z", flow_intensity: 3 },
      ];

      const { flowStatesInOrder } = generateGradientStops(flowData);

      expect(flowStatesInOrder).toEqual(["light", "medium"]);
    });
  });

  describe("Zero/Invalid Flow Intensity", () => {
    it("should ignore flow entries with intensity 0", () => {
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: 0 }, // should be ignored
        { date: "2024-01-16T00:00:00Z", flow_intensity: 2 },
      ];

      const { flowStatesInOrder } = generateGradientStops(flowData);

      expect(flowStatesInOrder).toEqual(["light"]);
    });

    it("should ignore flow entries with undefined intensity", () => {
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: undefined },
        { date: "2024-01-16T00:00:00Z", flow_intensity: 3 },
      ];

      const { flowStatesInOrder } = generateGradientStops(flowData);

      expect(flowStatesInOrder).toEqual(["medium"]);
    });

    it("should ignore flow entries with null intensity", () => {
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: null },
        { date: "2024-01-16T00:00:00Z", flow_intensity: 4 },
      ];

      const { flowStatesInOrder } = generateGradientStops(flowData);

      expect(flowStatesInOrder).toEqual(["heavy"]);
    });

    it("should handle all zero intensities by using default gradient", () => {
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: 0 },
        { date: "2024-01-16T00:00:00Z", flow_intensity: 0 },
      ];

      const { stops, flowStatesInOrder } = generateGradientStops(flowData);

      expect(flowStatesInOrder).toHaveLength(0);
      expect(stops[0].color).toBe(FlowColors.spotting);
      expect(stops[1].color).toBe(FlowColors.heavy);
    });
  });

  describe("Gradient Stop Calculations", () => {
    it("should calculate correct offsets for two flow types", () => {
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: 1 },
        { date: "2024-01-16T00:00:00Z", flow_intensity: 2 },
      ];

      const { stops } = generateGradientStops(flowData);

      expect(stops[0].offset).toBe("0%");
      expect(stops[1].offset).toBe("90%");
      expect(stops[2].offset).toBe("95%");
    });

    it("should calculate correct offsets for three flow types", () => {
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: 1 },
        { date: "2024-01-16T00:00:00Z", flow_intensity: 2 },
        { date: "2024-01-17T00:00:00Z", flow_intensity: 3 },
      ];

      const { stops } = generateGradientStops(flowData);

      expect(stops[0].offset).toBe("0%");
      expect(stops[1].offset).toBe("45%"); // (1 / 2) * 90 = 45
      expect(stops[2].offset).toBe("90%");
      expect(stops[3].offset).toBe("95%");
    });

    it("should calculate correct offsets for four flow types", () => {
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: 1 },
        { date: "2024-01-16T00:00:00Z", flow_intensity: 2 },
        { date: "2024-01-17T00:00:00Z", flow_intensity: 3 },
        { date: "2024-01-18T00:00:00Z", flow_intensity: 4 },
      ];

      const { stops } = generateGradientStops(flowData);

      expect(stops[0].offset).toBe("0%");
      expect(stops[1].offset).toBe("30%"); // (1 / 3) * 90 = 30
      expect(stops[2].offset).toBe("60%"); // (2 / 3) * 90 = 60
      expect(stops[3].offset).toBe("90%");
      expect(stops[4].offset).toBe("95%");
    });
  });

  describe("Tail Fade Color", () => {
    it("should always include tail fade color at 95%", () => {
      const testCases = [
        [],
        [{ date: "2024-01-15T00:00:00Z", flow_intensity: 1 }],
        [
          { date: "2024-01-15T00:00:00Z", flow_intensity: 1 },
          { date: "2024-01-16T00:00:00Z", flow_intensity: 2 },
        ],
      ];

      testCases.forEach((flowData) => {
        const { stops } = generateGradientStops(flowData);
        const lastStop = stops[stops.length - 1];
        
        expect(lastStop.offset).toBe("95%");
        expect(lastStop.color).toBe(FLOW_TAIL_COLOR);
      });
    });
  });

  describe("Color Validation", () => {
    it("should use valid FlowColors for all gradient stops", () => {
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: 1 },
        { date: "2024-01-16T00:00:00Z", flow_intensity: 2 },
        { date: "2024-01-17T00:00:00Z", flow_intensity: 3 },
        { date: "2024-01-18T00:00:00Z", flow_intensity: 4 },
      ];

      const { stops } = generateGradientStops(flowData);

      stops.forEach((stop, index) => {
        // Last stop should be tail color, others should be valid FlowColors
        if (index === stops.length - 1) {
          expect(stop.color).toBe(FLOW_TAIL_COLOR);
        } else {
          expect(Object.values(FlowColors)).toContain(stop.color);
        }
        // All should be valid hex colors
        expect(stop.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it("should match FlowColors exactly", () => {
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: 1 },
        { date: "2024-01-16T00:00:00Z", flow_intensity: 2 },
        { date: "2024-01-17T00:00:00Z", flow_intensity: 3 },
        { date: "2024-01-18T00:00:00Z", flow_intensity: 4 },
      ];

      const { stops, flowStatesInOrder } = generateGradientStops(flowData);

      flowStatesInOrder.forEach((flowType, index) => {
        expect(stops[index].color).toBe(FlowColors[flowType]);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle flow data with mixed valid and invalid entries", () => {
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: 0 },
        { date: "2024-01-16T00:00:00Z", flow_intensity: 2 },
        { date: "2024-01-17T00:00:00Z", flow_intensity: null },
        { date: "2024-01-18T00:00:00Z", flow_intensity: 3 },
      ];

      const { flowStatesInOrder } = generateGradientStops(flowData);

      expect(flowStatesInOrder).toEqual(["light", "medium"]);
    });

    it("should handle dates in different formats", () => {
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: 1 },
        { date: "2024-01-16T12:30:45Z", flow_intensity: 2 },
      ];

      const { flowStatesInOrder } = generateGradientStops(flowData);

      expect(flowStatesInOrder).toEqual(["spotting", "light"]);
    });

    it("should handle single day with multiple flow types (should not happen but be safe)", () => {
      // This shouldn't happen in real data, but we should handle it gracefully
      const flowData = [
        { date: "2024-01-15T00:00:00Z", flow_intensity: 1 },
        { date: "2024-01-15T12:00:00Z", flow_intensity: 2 },
      ];

      const { flowStatesInOrder } = generateGradientStops(flowData);

      // Should include both types in order of first appearance
      expect(flowStatesInOrder).toEqual(["spotting", "light"]);
    });
  });
});
