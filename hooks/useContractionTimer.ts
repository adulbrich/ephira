import { useEffect, useState } from "react";
import { useContractionTimerStore } from "@/assets/src/pregnancy-storage";
import { formatDuration } from "@/utils/formatDuration";

const TICK_MS = 1000;

export function useContractionTimer() {
  const {
    isRunning,
    startAt,
    lastDurationMs,
    startTimer,
    stopTimer,
  } = useContractionTimerStore();
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isRunning || startAt === null) {
      setElapsedMs(0);
      return;
    }

    const updateElapsed = () => setElapsedMs(Date.now() - startAt);
    updateElapsed();

    const intervalId = setInterval(updateElapsed, TICK_MS);
    return () => clearInterval(intervalId);
  }, [isRunning, startAt]);

  const toggle = () => {
    if (isRunning) {
      stopTimer();
      return;
    }
    startTimer();
  };

  return {
    isRunning,
    elapsedMs,
    lastDurationMs,
    toggle,
    formatDuration,
  };
}
