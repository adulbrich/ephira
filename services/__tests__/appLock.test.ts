import { appLockAction } from "@/services/appLock";
import type { AuthenticationChoice } from "@/db/authenticationChoice";
import { AUTH_TYPES } from "@/constants/Settings";

const choice = (value: string) => () => value as AuthenticationChoice;

describe("appLockAction", () => {
  describe("going to the background", () => {
    it("locks when a password is set", () => {
      expect(
        appLockAction("active", "background", choice(AUTH_TYPES.PASSWORD)),
      ).toBe("lock");
    });

    it("locks when device authentication is set", () => {
      expect(
        appLockAction("active", "background", choice(AUTH_TYPES.BIOMETRIC)),
      ).toBe("lock");
    });

    it("leaves the app alone when no lock is set", () => {
      expect(
        appLockAction("active", "background", choice(AUTH_TYPES.NONE)),
      ).toBe("ignore");
    });

    it("locks on iOS's inactive-to-background step too", () => {
      expect(
        appLockAction("inactive", "background", choice(AUTH_TYPES.PASSWORD)),
      ).toBe("lock");
    });

    it("locks when the choice cannot be read", () => {
      const unreadable = () => {
        throw new Error("database is locked");
      };

      expect(appLockAction("active", "background", unreadable)).toBe("lock");
    });
  });

  it("authenticates when the app comes back from the background, without reading the choice", () => {
    const readChoice = jest.fn(choice(AUTH_TYPES.PASSWORD));

    expect(appLockAction("background", "active", readChoice)).toBe(
      "reauthenticate",
    );
    expect(readChoice).not.toHaveBeenCalled();
  });

  it.each([
    ["active", "inactive"],
    ["inactive", "active"],
  ] as const)(
    "ignores %s to %s, which a Face ID prompt causes",
    (previous, next) => {
      const readChoice = jest.fn(choice(AUTH_TYPES.PASSWORD));

      expect(appLockAction(previous, next, readChoice)).toBe("ignore");
      expect(readChoice).not.toHaveBeenCalled();
    },
  );
});
