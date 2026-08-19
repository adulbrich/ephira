import {
  NotificationTypes,
  routeForNotification,
} from "@/constants/Notifications";

/**
 * Where a tapped notification sends the user.
 *
 * Extracted from the listener in `app/_layout.tsx`, which read `data.type`
 * off a payload it assumed was always there. SDK 55 retyped
 * `NotificationContent.data` as `Record<string, unknown> | undefined`, which
 * is what a notification with no payload actually delivers -- and reading
 * `.type` off it throws inside the listener.
 */
describe("routeForNotification", () => {
  it("sends every period notification to the calendar", () => {
    for (const type of [
      NotificationTypes.PERIOD_UPCOMING,
      NotificationTypes.PERIOD_TODAY,
      NotificationTypes.PERIOD_LATE,
    ]) {
      expect(routeForNotification({ type })).toBe("/(tabs)/calendar");
    }
  });

  it("stays put for a notification that is not about a period", () => {
    expect(
      routeForNotification({ type: NotificationTypes.LOW_DATA_QUALITY }),
    ).toBeNull();
    expect(
      routeForNotification({
        type: NotificationTypes.PREDICTION_ACCURACY_UPDATE,
      }),
    ).toBeNull();
  });

  it("stays put rather than throwing when there is no payload at all", () => {
    expect(routeForNotification(undefined)).toBeNull();
  });

  it("stays put when the payload carries no type", () => {
    expect(routeForNotification({})).toBeNull();
  });

  /**
   * `data` is `Record<string, unknown>`, so nothing stops a sender putting a
   * non-string under `type`. Comparing that against the string constants is
   * a false match waiting to happen if the check ever loosens to `==`.
   */
  it("stays put when type is not a string", () => {
    expect(routeForNotification({ type: 42 })).toBeNull();
    expect(routeForNotification({ type: null })).toBeNull();
    expect(
      routeForNotification({ type: { toString: () => "period_today" } }),
    ).toBeNull();
  });
});
