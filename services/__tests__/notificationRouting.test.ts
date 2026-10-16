/**
 * The launch read in `app/index.tsx`. expo-notifications is native, so it is
 * mocked, and the module is loaded in isolation per test so each starts with
 * a fresh guard.
 */
import { NotificationTypes } from "@/constants/Notifications";

const mockGetLastResponse = jest.fn();
const mockClearLastResponse = jest.fn();
jest.mock("expo-notifications", () => ({
  getLastNotificationResponse: () => mockGetLastResponse(),
  clearLastNotificationResponse: () => mockClearLastResponse(),
}));

const periodToday = {
  notification: {
    request: {
      identifier: "a",
      content: { data: { type: NotificationTypes.PERIOD_TODAY } },
    },
  },
};

describe("takeLaunchNotificationRoute", () => {
  let routing: typeof import("@/services/notificationRouting");

  beforeEach(() => {
    mockGetLastResponse.mockReset();
    mockClearLastResponse.mockReset();
    jest.isolateModules(() => {
      routing = jest.requireActual("@/services/notificationRouting");
    });
  });

  it("reads the tap that launched the app, then clears it", () => {
    mockGetLastResponse.mockReturnValue(periodToday);

    expect(routing.takeLaunchNotificationRoute()).toBe("/(tabs)/calendar");
    expect(mockClearLastResponse).toHaveBeenCalledTimes(1);

    const [read] = mockGetLastResponse.mock.invocationCallOrder;
    const [clear] = mockClearLastResponse.mock.invocationCallOrder;
    expect(read).toBeLessThan(clear);
  });

  it("clears nothing when no tap launched the app", () => {
    mockGetLastResponse.mockReturnValue(null);

    expect(routing.takeLaunchNotificationRoute()).toBeNull();
    expect(mockClearLastResponse).not.toHaveBeenCalled();
  });

  it("lands as usual on web, where reading the last response throws", () => {
    mockGetLastResponse.mockImplementation(() => {
      throw new Error("UnavailabilityError");
    });

    expect(routing.takeLaunchNotificationRoute()).toBeNull();
    expect(mockClearLastResponse).not.toHaveBeenCalled();
  });

  it("does not route a launch tap the listener already took", () => {
    mockGetLastResponse.mockReturnValue(periodToday);
    routing.takeNotificationRoute(periodToday);

    expect(routing.takeLaunchNotificationRoute()).toBeNull();
  });
});
