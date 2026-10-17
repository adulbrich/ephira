import * as Notifications from "expo-notifications";
import { routeEachResponseOnce } from "@/constants/Notifications";

/** Takes a tap's route once. See `routeEachResponseOnce` for why it is shared. */
export const takeNotificationRoute = routeEachResponseOnce();

/**
 * Takes the route of the tap that launched the app, or `null`, and clears the
 * last response so a later read finds nothing.
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
  return takeNotificationRoute(response);
};
