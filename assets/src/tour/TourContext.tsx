import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { router } from "expo-router";
import type { TourStep } from "./types";
import { setHasSeenWalkthrough } from "../onboarding/onboarding-storage";

type AnchorRef = React.RefObject<any>;

type TourState = {
  isActive: boolean;
  stepIndex: number;
  steps: TourStep[];
  start: (steps: TourStep[]) => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  registerAnchor: (id: string, ref: AnchorRef) => void;
  getAnchor: (id: string) => AnchorRef | undefined;
};

const TourContext = createContext<TourState | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const anchors = useRef(new Map<string, AnchorRef>());

  const [isActive, setIsActive] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);

  const registerAnchor = useCallback((id: string, ref: AnchorRef) => {
    anchors.current.set(id, ref);
  }, []);

  const getAnchor = useCallback((id: string) => anchors.current.get(id), []);

  const start = useCallback((newSteps: TourStep[]) => {
    setSteps(newSteps);
    setStepIndex(0);
    setIsActive(true);
  }, []);

  const stop = useCallback(() => {
    // fire-and-forget so callers don't need to await
    void (async () => {
      await setHasSeenWalkthrough(true);
    })();

    setIsActive(false);
    setSteps([]);
    setStepIndex(0);
  }, []);

  const goToStep = useCallback(
    async (index: number) => {
      if (index < 0 || index >= steps.length) return;

      const step = steps[index];
      // Navigate first so the anchor actually exists in the UI tree.
      router.replace(step.route as any);

      // Give the UI a moment to render before the overlay measures anchors.
      await new Promise((r) => setTimeout(r, 350));
      setStepIndex(index);
    },
    [steps],
  );

  const next = useCallback(() => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= steps.length) {
      stop();
      return;
    }
    void goToStep(nextIndex);
  }, [goToStep, stepIndex, steps.length, stop]);

  const prev = useCallback(() => {
    const prevIndex = stepIndex - 1;
    if (prevIndex < 0) return;
    void goToStep(prevIndex);
  }, [goToStep, stepIndex]);

  const value = useMemo(
    () => ({
      isActive,
      stepIndex,
      steps,
      start,
      stop,
      next,
      prev,
      registerAnchor,
      getAnchor,
    }),
    [
      isActive,
      stepIndex,
      steps,
      start,
      stop,
      next,
      prev,
      registerAnchor,
      getAnchor,
    ],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
