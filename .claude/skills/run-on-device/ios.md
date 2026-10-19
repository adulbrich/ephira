# iOS simulator

## Build

- Build for one simulator: `-destination 'platform=iOS Simulator,id=<udid>'`. A
  generic simulator destination, or any Release build, compiles x86_64 as well and
  doubles the time; for Release also pass `ONLY_ACTIVE_ARCH=YES ARCHS=arm64`.
  Reusing the same `-derivedDataPath` keeps what was already compiled.
- `pod install` fails with "Unicode Normalization not appropriate for ASCII-8BIT"
  unless `LANG=en_US.UTF-8` and `LC_ALL=en_US.UTF-8` are set.
- `expo prebuild` regenerates `ios/` even without `--clean`, so flipping a config
  plugin option costs a full pod install and build.
- Wait for the home screen, about ten seconds after boot, before
  `simctl install` or any input; an install right after boot can hang.

## Point the app at your Metro

```bash
xcrun simctl launch <udid> com.capucity.ephira -RCT_jsLocation localhost:<port>
```

A cold start takes no launch arguments (a deep link, a notification tap), so
persist the location instead:

```bash
xcrun simctl spawn <udid> defaults write com.capucity.ephira RCT_jsLocation localhost:<port>
```

If an argument-free launch then shows "No script URL provided", the app is reading
its container's own preferences, which can hold a stale port. Write those:

```bash
C=$(xcrun simctl get_app_container <udid> com.capucity.ephira data)
xcrun simctl spawn <udid> defaults write "$C/Library/Preferences/com.capucity.ephira" RCT_jsLocation localhost:<port>
```

## Notifications and lifecycle

- Grant notifications from the app's Settings, Notifications; `simctl privacy` has
  no notifications service.
- Send one with `xcrun simctl push <udid> com.capucity.ephira <file>.apns`, with
  the app's `data` under a top-level `body` key. Wait about two seconds and take a
  screenshot to confirm the banner is up before tapping it. Push latency grows over
  a long session, so do notification steps early.
- Background and foreground without touch input: `xcrun simctl launch <udid>
  com.apple.Preferences`, then launch ephira again. The same process goes
  `background`, then `active`.
- To work on a copy of a simulator's state (apps, data, keychain), clone it while
  it is shut down: `xcrun simctl clone <udid> "<name>"`.
