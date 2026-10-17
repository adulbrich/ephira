import { appLockAction } from "@/services/appLock";
import type { AuthenticationChoice } from "@/db/authenticationChoice";

const choice = (value: AuthenticationChoice) => () => value;

describe("appLockAction", () => {
  describe("going to the background", () => {
    it("locks when a password is set", () => {
      expect(appLockAction("active", "background", choice("password"))).toBe(
        "lock",
      );
    });

    it("locks when device authentication is set", () => {
      expect(appLockAction("active", "background", choice("biometric"))).toBe(
        "lock",
      );
    });

    it("leaves the app alone when no lock is set", () => {
      // The defect: Android shows the share sheet as its own activity, so
      // every export went to the background, unmounted the navigator, and came
      // back on Home instead of Export Data.
      expect(appLockAction("active", "background", choice("none"))).toBe(
        "ignore",
      );
    });

    it("locks on iOS's inactive-to-background step too", () => {
      expect(appLockAction("inactive", "background", choice("password"))).toBe(
        "lock",
      );
    });

    it("locks when the choice cannot be read", () => {
      const unreadable = () => {
        throw new Error("database is locked");
      };

      expect(appLockAction("active", "background", unreadable)).toBe("lock");
    });
  });

  it("authenticates when the app comes back from the background", () => {
    expect(appLockAction("background", "active", choice("password"))).toBe(
      "reauthenticate",
    );
  });

  it.each([
    ["active", "inactive"],
    ["inactive", "active"],
  ] as const)(
    "ignores %s to %s, which a Face ID prompt or the iOS share sheet causes",
    (previous, next) => {
      const readChoice = jest.fn(choice("password"));

      expect(appLockAction(previous, next, readChoice)).toBe("ignore");
      expect(readChoice).not.toHaveBeenCalled();
    },
  );
});
