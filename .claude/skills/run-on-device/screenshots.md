# Screenshots for the website

The landing page's stills (`docs/src/assets/screens/`) come from an iOS simulator
with fictional data. The repository and the site are public: never capture real
data.

1. **Start from an empty iPhone 17e simulator**, the model the other stills came
   from. `xcrun simctl shutdown <udid>`, then `xcrun simctl erase <udid>`, which
   refuses a booted device: stop if it fails. Then install the Debug build, so
   nothing typed into an earlier run (the 1.4.0 fixture in
   [upgrade.md](upgrade.md), say) shows up in a still.
2. **Seed fictional data.** No seed script is committed.
   - Launch the build once, which runs the first-launch setup, and finish the
     walkthrough, so later launches open on the tabs. On a first launch that
     setup can run twice, and its `setupEntryTypes()` clears symptom, mood and
     medication entries, so a seed must not run on that launch.
   - Write a throwaway module named `*.local.ts`, which `.gitignore` keeps out of
     commits, outside `app/`, where expo-router would read it as a route
     (`db/seed.local.ts` works). It calls the Day, Entry and Catalogue insert
     helpers in `db/operations` with fixed dates, never ones counted from today.
     Those helpers update a row that already exists (an Entry matches on its
     Day and Catalogue item), so running it again finishes a seed a reload cut
     short and changes nothing after one that completed.
   - Call it in `app/_layout.tsx`'s setup effect after the first-launch block,
     behind one shared promise (`running ??= seed()`), because that effect can
     run twice. Relaunch to seed, then relaunch again before capturing: the
     insert helpers signal no change, so screens that loaded during the seed
     show partial data.
   - Remove the call when you are done. A commit that keeps it fails CI: an
     `import` of a module the repository lacks fails typecheck, and a `require`
     fails ESLint's `no-require-imports`.
3. **Clean the status bar.**
   `xcrun simctl status_bar <udid> override --time 9:41 --batteryState charged --batteryLevel 100`.
   A relaunch through another app can leave a "Settings" breadcrumb in the status
   bar; launch ephira cold instead.
4. **Capture with `simctl`**, not a window screenshot, so the frame is the
   device's own pixels: `xcrun simctl io <udid> screenshot shot.png`.
5. **Convert to a 959x2077 WebP**, the size of the other stills, in the website's
   assets (`cwebp` comes from Homebrew's `webp` package):

   ```sh
   sips -Z 2077 shot.png --out shot-small.png
   cwebp -q 88 shot-small.png -o docs/src/assets/screens/<name>.webp
   ```

The website asks Astro for the smaller copies it serves; see `docs/README.md`.
