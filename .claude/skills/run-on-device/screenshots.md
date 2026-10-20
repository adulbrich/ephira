# Screenshots for the website

The landing page's stills (`docs/src/assets/screens/`) come from an iOS simulator
with fictional data. The repository and the site are public: never capture real
data.

1. **Start from an empty simulator.** `xcrun simctl erase <udid>`, then install
   the Debug build, so nothing typed into an earlier run (the 1.4.0 fixture in
   [upgrade.md](upgrade.md), say) shows up in a still.
2. **Seed fictional data.** No seed script is committed. Launch the build once
   and finish the walkthrough, so the first-launch setup has run. Then write a
   throwaway module named `*.local.ts`, which `.gitignore` keeps out of commits,
   that calls the `db/operations` insert helpers and returns early when any Day
   exists. Call it in `app/_layout.tsx`'s setup effect after the first-launch
   block, guard it with one shared promise (`running ??= seed()`) because that
   effect can run twice, and relaunch. Inside the first-launch block it would
   race that block's second run, which can call `setupEntryTypes()` again and
   clear what the seed wrote. Remove the call when you are done: a commit that
   keeps it breaks the build, since the module it names is not in the
   repository.
3. **Clean the status bar.**
   `xcrun simctl status_bar <udid> override --time 9:41 --batteryState charged --batteryLevel 100`.
   A relaunch through another app can leave a "Settings" breadcrumb in the status
   bar; launch ephira cold instead.
4. **Capture with `simctl`**, not a window screenshot, so the frame is the
   device's own pixels: `xcrun simctl io <udid> screenshot shot.png`.
5. **Convert to a WebP 2077 px tall**, the height of the other stills, in the
   website's assets (`cwebp` comes from Homebrew's `webp` package). Use the same
   simulator model as the rest, so the width matches too:

   ```sh
   sips -Z 2077 shot.png --out shot-small.png
   cwebp -q 88 shot-small.png -o docs/src/assets/screens/<name>.webp
   ```

The website asks Astro for the smaller copies it serves; see `docs/README.md`.
