import {
  DEFAULT_AUTHENTICATION_CHOICE,
  chooseBiometric,
  chooseNoAuthentication,
  choosePassword,
  loadAuthenticationChoice,
} from "@/db/authenticationChoice";
import { getSetting, insertSetting } from "@/db/operations/settings";
import { AUTH_TYPES, SettingsKeys } from "@/constants/Settings";
import { resetTestDatabase } from "@/__tests__/helpers/testDatabase";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

const mockDigest = jest.fn();
jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: (...args: unknown[]) => mockDigest(...args),
}));

const stored = async (key: string) => (await getSetting(key))?.value ?? null;

beforeEach(() => {
  resetTestDatabase();
  mockDigest.mockReset();
  mockDigest.mockResolvedValue("hashed");
});

describe("loadAuthenticationChoice", () => {
  it("defaults to none for a user who has never chosen", async () => {
    expect(await loadAuthenticationChoice()).toBe(
      DEFAULT_AUTHENTICATION_CHOICE,
    );
  });

  it("writes the default down, so it is a choice on record", async () => {
    await loadAuthenticationChoice();

    expect(await stored(SettingsKeys.authentication)).toBe(AUTH_TYPES.NONE);
  });

  it("returns what the user chose", async () => {
    await chooseBiometric();

    expect(await loadAuthenticationChoice()).toBe(AUTH_TYPES.BIOMETRIC);
  });

  it("falls back to the default for a value it does not recognise", async () => {
    await insertSetting(SettingsKeys.authentication, "fingerprint-ish");

    expect(await loadAuthenticationChoice()).toBe(
      DEFAULT_AUTHENTICATION_CHOICE,
    );
  });
});

describe("choosePassword", () => {
  it("stores the hash, never the plaintext", async () => {
    await choosePassword("hunter2");

    expect(mockDigest).toHaveBeenCalledWith("SHA-256", "hunter2");
    expect(await stored(SettingsKeys.password)).toBe("hashed");
    expect(await loadAuthenticationChoice()).toBe(AUTH_TYPES.PASSWORD);
  });

  it("leaves the previous mode intact when deriving the credential fails", async () => {
    // The defect: the mode was committed before the hash existed, so a
    // rejection here left "password mode, no password" on disk, and the only
    // recovery was the reset that deletes all data.
    await chooseBiometric();
    mockDigest.mockRejectedValue(new Error("no crypto today"));

    await expect(choosePassword("hunter2")).rejects.toThrow("no crypto today");

    expect(await loadAuthenticationChoice()).toBe(AUTH_TYPES.BIOMETRIC);
    expect(await stored(SettingsKeys.password)).toBeNull();
  });

  it("never leaves password mode without a password", async () => {
    mockDigest.mockRejectedValue(new Error("nope"));

    await expect(choosePassword("hunter2")).rejects.toThrow();

    const mode = await stored(SettingsKeys.authentication);
    const password = await stored(SettingsKeys.password);
    expect(mode === AUTH_TYPES.PASSWORD && password === null).toBe(false);
  });
});

describe("leaving password mode", () => {
  it("choosing biometric leaves no stored password behind", async () => {
    await choosePassword("hunter2");

    await chooseBiometric();

    expect(await stored(SettingsKeys.password)).toBeNull();
    expect(await loadAuthenticationChoice()).toBe(AUTH_TYPES.BIOMETRIC);
  });

  it("choosing none leaves no stored password behind", async () => {
    await choosePassword("hunter2");

    await chooseNoAuthentication();

    expect(await stored(SettingsKeys.password)).toBeNull();
    expect(await loadAuthenticationChoice()).toBe(AUTH_TYPES.NONE);
  });
});
