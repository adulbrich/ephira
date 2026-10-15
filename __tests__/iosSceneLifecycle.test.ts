import appConfig from "@/app.json";

/**
 * Why the iOS app adopts the UIScene lifecycle, and when this can go.
 *
 * A binary linked against the iOS 27 SDK must use the scene-based lifecycle.
 * Expo SDK 57's template does not: its AppDelegate creates the window in
 * `application(_:didFinishLaunchingWithOptions:)` and Info.plist declares no
 * `UIApplicationSceneManifest`, so on iOS 27 UIKit traps in
 * `___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption` while it
 * creates the first scene, before any JavaScript runs.
 *
 * `ios.enableSceneSupport` (expo-build-properties 57.0.19+, needs expo
 * 57.0.23+) makes prebuild add the scene manifest, point it at Expo's
 * `EXExpoAppSceneDelegate`, and move window creation out of the AppDelegate.
 *
 * Nothing else notices if the flag goes: iOS 26 runs either way, and EAS's
 * default SDK 57 image still builds with Xcode 26. The first Xcode 27 build
 * would crash at launch on iOS 27. Expo SDK 58's template adopts scenes itself
 * and the flag becomes a no-op; remove the flag and this file together then.
 */
type IosBuildProperties = {
  enableSceneSupport?: boolean;
};

/**
 * Read loosely on purpose, as in androidSdkFloor.test.ts: a typed lookup would
 * turn a removed flag into a compile error here instead of a failed assertion
 * that says what is wrong.
 */
function iosBuildProperties(): IosBuildProperties | undefined {
  for (const plugin of appConfig.expo.plugins as unknown[]) {
    if (Array.isArray(plugin) && plugin[0] === "expo-build-properties") {
      return (plugin[1] as { ios?: IosBuildProperties } | undefined)?.ios;
    }
  }
  return undefined;
}

describe("the iOS scene lifecycle", () => {
  it("is adopted through expo-build-properties while on Expo SDK 57", () => {
    expect(iosBuildProperties()?.enableSceneSupport).toBe(true);
  });
});
