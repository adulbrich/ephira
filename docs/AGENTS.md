# docs

These rules are for the website (`src/`, `public/`); `README.md` says what else
lives here.

- **Brand colours live once, in `src/styles/global.css`'s `@theme` block.** Pages
  use them as utilities (`bg-plum-950`, `text-cream`). Add a colour there rather
  than writing its hex into a class.
- **Images go in `src/assets`, not `public/`.** Astro resizes and re-encodes
  what it imports from `src/assets`; anything under `public/` ships byte for byte.
- **A screenshot shows fictional data only.** The repository and the site are
  public. Retake one with the `run-on-device` skill's `screenshots.md`.
- **One App Store badge per page.** Apple's badge license allows one per layout,
  and `StoreBadges.astro` is the only place it renders.
- **Every claim on a page is true of the build its store links install.** The
  site deploys when `main` changes; the app reaches people only through a store
  release. A page that describes unreleased behaviour waits for that release.
