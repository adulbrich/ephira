import { FlowType } from "@/constants/Colors";
export const MAX_FLOW_LENGTH = 7;
export const FLOW_TAIL_PERCENT = 0.08;
export const FLOW_TAIL_COLOR = "#c6a4dbff";

export function getFlowTypeString(intensity: number): FlowType | undefined {
  switch (intensity) {
    case 1:
      return "spotting";
    case 2:
      return "light";
    case 3:
      return "medium";
    case 4:
      return "heavy";
    default:
      // If 0 or any other number, treat as no flow/undefined
      return undefined;
  }
}
