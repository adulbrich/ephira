import { create } from "zustand";

interface AppRestart {
  restarting: boolean;
  restart: () => void;
  finishRestart: () => void;
}

/**
 * Starts the app again from app/index.tsx, as a launch does, by having the
 * root layout render no navigator for one commit, the way the lock replaces
 * it. Neither a route nor a new key does: every group's index is "/", so
 * router.replace("/") stays in the group it is called from, and a navigator
 * remounted in the same commit is handed its old state back.
 */
export const useAppRestart = create<AppRestart>((set) => ({
  restarting: false,
  restart: () => set({ restarting: true }),
  finishRestart: () => set({ restarting: false }),
}));
