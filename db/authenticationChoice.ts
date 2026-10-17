import * as Crypto from "expo-crypto";
import {
  deleteSetting,
  getSetting,
  getSettingSync,
  insertSetting,
  updateSetting,
} from "@/db/operations/settings";
import { AUTH_TYPES, SettingsKeys } from "@/constants/Settings";

/** How the app is locked, if it is. */
export type AuthenticationChoice = "none" | "biometric" | "password";

const KNOWN: AuthenticationChoice[] = [
  AUTH_TYPES.NONE,
  AUTH_TYPES.BIOMETRIC,
  AUTH_TYPES.PASSWORD,
] as AuthenticationChoice[];

/** Nothing is locked unless the user says so. */
export const DEFAULT_AUTHENTICATION_CHOICE: AuthenticationChoice = "none";

/**
 * Which authentication is on, with the default written down.
 *
 * The settings screen mapped the stored string onto one of three values with a
 * four-branch `if`, inline in an effect, and did not write the default, so an
 * untouched install had no choice on record. `db/preferences.ts` already owns
 * that shape.
 */
export async function loadAuthenticationChoice(): Promise<AuthenticationChoice> {
  const stored = await getSetting(SettingsKeys.authentication);
  const value = stored?.value as AuthenticationChoice | undefined;

  if (value && KNOWN.includes(value)) return value;

  await insertSetting(
    SettingsKeys.authentication,
    DEFAULT_AUTHENTICATION_CHOICE,
  );
  return DEFAULT_AUTHENTICATION_CHOICE;
}

/**
 * Which authentication is on, read without awaiting and without writing the
 * default.
 *
 * The root layout asks as the app goes to the background. An await there can
 * resolve only after the OS has suspended JS, and the answer cannot be cached
 * from launch: a lock turned on in Settings must apply at the next background.
 */
export function readAuthenticationChoiceSync(): AuthenticationChoice {
  const value = getSettingSync(SettingsKeys.authentication)?.value as
    | AuthenticationChoice
    | undefined;

  return value && KNOWN.includes(value) ? value : DEFAULT_AUTHENTICATION_CHOICE;
}

/**
 * The mode and the credential move together.
 *
 * Three handlers each knew their own half of that, and one of them committed
 * the mode before the credential existed: `handleSetPassword` wrote
 * `authentication = password` and then awaited `Crypto.digestStringAsync`. A
 * rejection there left the durable state as "password mode, no password", and
 * the only way out was the reset that deletes all data.
 *
 * So the credential is derived first and written first. A failure part-way
 * leaves the previous mode intact, which is the property worth having: a stale
 * password row under a non-password mode is unreachable, a missing password
 * row under password mode is a lockout.
 */
export async function choosePassword(plaintext: string): Promise<void> {
  const hashed = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    plaintext,
  );

  await updateSetting(SettingsKeys.password, hashed);
  await updateSetting(SettingsKeys.authentication, AUTH_TYPES.PASSWORD);
}

export async function chooseBiometric(): Promise<void> {
  await updateSetting(SettingsKeys.authentication, AUTH_TYPES.BIOMETRIC);
  await deleteSetting(SettingsKeys.password);
}

export async function chooseNoAuthentication(): Promise<void> {
  await updateSetting(SettingsKeys.authentication, AUTH_TYPES.NONE);
  await deleteSetting(SettingsKeys.password);
}
