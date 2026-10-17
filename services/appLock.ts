import type { AppStateStatus } from "react-native";
import { AUTH_TYPES } from "@/constants/Settings";
import type { AuthenticationChoice } from "@/db/authenticationChoice";

/** What the root layout does about the lock when AppState changes. */
export type AppLockAction = "lock" | "reauthenticate" | "ignore";

/**
 * Going to the background locks the app only when a lock is on.
 *
 * Locking replaces the navigator with the lock view, which unmounts it, so the
 * app comes back on its first screen. With a lock that is the price of
 * locking. Without one it bought nothing: Android shows the share sheet as a
 * separate activity, so every export went to the background and came back on
 * Home instead of Export Data, and on both platforms leaving the app and
 * returning did the same.
 *
 * `readChoice` is called only on the way to the background, so the choice is
 * the one in force then. A choice that cannot be read locks.
 */
export function appLockAction(
  previous: AppStateStatus,
  next: AppStateStatus,
  readChoice: () => AuthenticationChoice,
): AppLockAction {
  if (previous === "background" && next === "active") return "reauthenticate";
  if (next !== "background") return "ignore";

  try {
    return readChoice() === AUTH_TYPES.NONE ? "ignore" : "lock";
  } catch {
    return "lock";
  }
}
