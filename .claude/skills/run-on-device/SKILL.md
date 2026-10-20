---
name: run-on-device
description: Run ephira on an iOS simulator or Android emulator and drive it, from a development build through a Metro of its own to deep links, notification taps and the database on the device, including an upgrade from a 1.4.0 install. Use when asked to run, screenshot or verify a change in the app, or to reproduce a bug on a device.
---

Ephira needs a development build; Expo Go cannot run it (`CONTRIBUTING.md`, section
1). The app id is `com.capucity.ephira` on both platforms. Platform steps live in
[ios.md](ios.md) and [android.md](android.md); read the one you need. Stills for
the website follow [screenshots.md](screenshots.md).

## 1. Get a build installed

- **Native inputs changed** (a dependency with native code, `app.json`): build with
  `npm run ios` or `npm run android`. The first build compiles every native
  dependency; expect tens of minutes.
- **JavaScript only:** reuse an installed Debug build when no native input changed
  since it was built (`git diff <its commit> -- app.json package.json
  package-lock.json` is empty). The JavaScript comes from your Metro, so only the
  native side has to match. Say in the PR which build you used.

## 2. Serve JavaScript from a Metro of your own

The Debug app loads its bundle from port 8081, compiled in. Another session's Metro
on that port serves its own checkout's code to your app, with no sign of it.

1. `lsof -iTCP:8081 -sTCP:LISTEN`. If anything holds it, pick another port.
2. `npx expo start --dev-client --localhost --port <port>`.
3. Point the app at that port: [ios.md](ios.md) or [android.md](android.md).

The step is done when the Metro log shows `Bundled` for your platform after you
launch the app. Then:

- `CI=1` turns file watching off, so restart Metro after an edit; without it,
  Metro watches even in the background.
- To prove an edit reached the app, fetch the bundle and grep for the new code:
  `curl -s "http://localhost:<port>/node_modules/expo-router/entry.bundle?platform=ios&dev=true&minify=false"`
  (`curl -g` when the host is `[::1]`).
- A slow first bundle can make the app give up with "Could not connect to
  development server". Relaunch once Metro logs `Bundled`.

## 3. Drive it

- Name the device in every command (UDID or serial). With several booted,
  `booted` or the default device is whichever one answers first.
- Screenshot after each step. Scripted taps go out of step after a Fast Refresh,
  which collapses the open Section.
- Custom Entries' "+" needs two taps: the first only dismisses the keyboard.

## 4. Upgrades from 1.4.0

Every install up to 1.4.0 holds a plaintext database, and the first launch of a
newer build encrypts it. To test that path, read [upgrade.md](upgrade.md).
