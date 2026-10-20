# Screenshots for the website

The landing page's stills (`docs/src/assets/screens/`) come from an iOS simulator
with fictional data. The repository and the site are public: never capture real
data.

1. **Seed fictional data.** No seed script is committed. Write a throwaway module
   that calls the `db/operations` insert helpers and import it in
   `app/_layout.tsx` right after `setupEntryTypes()`. That effect fires twice, and
   a second run hits the unique index on `symptoms.name`, so guard the seed with
   one shared promise (`running ??= seed()`). Delete the module and the import
   before you commit anything.
2. **Clean the status bar.**
   `xcrun simctl status_bar <udid> override --time 9:41 --batteryState charged --batteryLevel 100`.
   A relaunch through another app can leave a "Settings" breadcrumb in the status
   bar; launch ephira cold instead.
3. **Capture with `simctl`**, not a window screenshot, so the frame is the
   device's own pixels: `xcrun simctl io <udid> screenshot shot.png`.
4. **Convert to a 959 px WebP** in the website's assets (`cwebp` comes from
   Homebrew's `webp` package):

   ```sh
   sips -Z 2077 shot.png --out shot-small.png
   cwebp -q 88 shot-small.png -o docs/src/assets/screens/<name>.webp
   ```

The website asks Astro for the smaller copies it serves; see `docs/README.md`.
