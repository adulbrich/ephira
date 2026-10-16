import * as Notifications from "expo-notifications";
import { routeEachResponseOnce } from "@/constants/Notifications";

/**
 * Where a tapped notification sends the user, or `null` if it goes nowhere or
 * was already routed. The tap listener and the launch read below must share
 * this one instance; separate instances could each route the same tap.
 */
export const routeForNotificationResponse = routeEachResponseOnce();

/**
 * Where the tap that launched the app should send the user, or `null`.
 *
 * A tap on a terminated app reaches expo-notifications natively before any
 * JS listener exists, so the listener in `app/_layout.tsx` never hears it;
 * it survives only as the last response. Clearing it here means the next
 * mount of the index route, after every return from the background, reads
 * nothing.
 */
export const takeLaunchNotificationRoute = () => {
  let response: Notifications.NotificationResponse | null;
  try {
    response = Notifications.getLastNotificationResponse();
  } catch {
    // Web has no last response and throws UnavailabilityError. Missing a
    // launch tap should land the app where it always lands, not leave it on
    // the blank index route.
    return null;
  }
  if (response) Notifications.clearLastNotificationResponse();
  return routeForNotificationResponse(response);
};
