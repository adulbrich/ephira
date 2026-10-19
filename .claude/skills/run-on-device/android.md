# Android emulator

## Build and boot

- `ANDROID_HOME` must point at the SDK. Start the emulator and wait for
  `adb shell getprop sys.boot_completed` to print `1` before installing; earlier,
  adb reports `cmd: Can't find service: package`.
- Headless: `emulator -avd <name> -no-window -no-audio -no-boot-anim
  -no-snapshot-save -memory 3072`.
- A Debug Gradle build takes tens of minutes. Release:
  `./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`. It is signed
  with the debug keystore, so `adb install -r` puts it over a Debug build and keeps
  the app's data.

## Point the app at your Metro

`expo start --localhost` binds only `[::1]`, and the emulator reaches the host at
`10.0.2.2` over IPv4, so the app shows "Unable to load script". Run a relay that
listens on `127.0.0.1:<port>` and pipes each connection to `[::1]:<port>` (keep it
on loopback), then write `debug_http_host` as `10.0.2.2:<port>` into
`shared_prefs/com.capucity.ephira_preferences.xml` with `run-as`.

## Notifications and UI state

- Cold start from a notification without a push service: post it from the app,
  press Home, then `adb shell am kill com.capucity.ephira`. `am force-stop` also
  removes the app's notifications. Open the shade with
  `adb shell cmd statusbar expand-notifications` and tap the entry.
- An open Paper `Modal` shows a `content-desc="Close modal"` node; an open Paper
  `Dialog` shows its action label. `uiautomator dump` lists nodes behind a modal
  and can lag a screen behind, so trust screenshots.
- `adb shell input keyevent 4` (Back) takes the app out of touch mode, and the
  next screenshot can show a focus ring; take pixel baselines after a tap.

## The database

Emulator images have no `sqlite3`. Copy the database out and back through
`run-as`; SELinux stops `run-as` reading `/data/local/tmp` directly.

```bash
adb exec-out run-as com.capucity.ephira cat files/SQLite/ephira.encrypted.db > copy.db
cat copy.db | adb shell run-as com.capucity.ephira sh -c 'cat > files/SQLite/ephira.encrypted.db'
```

## 16 KB pages

Every 64-bit `.so` needs a minimum LOAD alignment of at least `0x4000`
(`llvm-readelf -lW`); check `extractNativeLibs` with `aapt2 dump xmltree`, and run
`zipalign -c -P 16 -v 4 <apk>`.
