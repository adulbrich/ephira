import appConfig from "@/app.json";

/**
 * The Android API level this app must build against, and why.
 *
 * Google Play notified this project that it had to support 16 KB memory page
 * sizes. The answer, in 9d3668a, was to build against API 35 with matching
 * build tools: from there AGP and the NDK link native libraries with 16384
 * alignment and package them so they are mapped rather than extracted, which
 * is what a 16 KB device needs. That was measured on both a debug APK and a
 * release AAB in #255 -- every 64-bit `.so` has PT_LOAD alignment 16384 and the
 * manifest carries `extractNativeLibs="false"`.
 *
 * Those pins were then removed in 5c24c26, and compliance survived only because
 * Expo's own default had moved past 35 by then. That is a fine outcome resting
 * on an accident: nothing in this repo said the requirement existed, so
 * anything that set a lower `compileSdkVersion` would have dropped 16 KB
 * support with no signal. `plugins/withAndroid16KBSupport.js` did not guard it
 * -- it never touched page size, and #255 records what it actually did.
 *
 * So the requirement is stated in app.json now, and this is what notices if it
 * slips. Raising the pins on an SDK upgrade is expected; lowering either of
 * them below the floor is the thing that must not pass quietly.
 */
const SIXTEEN_KB_MINIMUM_API = 35;

type AndroidBuildProperties = {
  compileSdkVersion?: number;
  targetSdkVersion?: number;
};

/**
 * Read loosely on purpose. TypeScript knows app.json's literal shape, so a
 * typed lookup would restate the pins rather than check them, and removing one
 * would surface as a compile error in this file instead of a failed assertion
 * that says what is wrong.
 */
function pluginNames(): string[] {
  return (appConfig.expo.plugins as unknown[]).map((plugin) =>
    Array.isArray(plugin) ? String(plugin[0]) : String(plugin),
  );
}

function androidBuildProperties(): AndroidBuildProperties | undefined {
  for (const plugin of appConfig.expo.plugins as unknown[]) {
    if (Array.isArray(plugin) && plugin[0] === "expo-build-properties") {
      return (plugin[1] as { android?: AndroidBuildProperties } | undefined)
        ?.android;
    }
  }
  return undefined;
}

describe("the Android API floor", () => {
  it("is stated in app.json rather than inherited from an Expo default", () => {
    expect(androidBuildProperties()).toBeDefined();
  });

  it.each(["compileSdkVersion", "targetSdkVersion"] as const)(
    "pins %s at or above the level 16 KB page support needs",
    (key) => {
      const value = androidBuildProperties()?.[key];

      expect(typeof value).toBe("number");
      expect(value).toBeGreaterThanOrEqual(SIXTEEN_KB_MINIMUM_API);
    },
  );

  it("no longer carries the plugin that claimed to provide 16 KB support", () => {
    // It only ever set android.enableJetifier, which is unrelated to page size.
    // Removing it changed nothing in either artifact; see #255.
    expect(pluginNames()).not.toContain("./plugins/withAndroid16KBSupport.js");
  });
});
