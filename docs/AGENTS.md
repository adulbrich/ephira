# docs

These rules are for the website (`src/`, `public/`); `README.md` says what else
lives here.

- **Brand colours live once, in `src/styles/global.css`'s `@theme` block.** Pages
  use them as utilities (`bg-plum-950`, `text-cream`). Add a colour there rather
  than writing its hex into a class.
- **Images a page renders go in `src/assets`, not `public/`.** Astro gives each
  file it imports a hashed name, and `Shot.astro` asks `<Picture>` for resized
  AVIF and WebP copies; `public/` ships byte for byte at a fixed path, which
  suits only files linked by one, like `favicon.svg`.
- **A screenshot shows fictional data only.** The repository and the site are
  public. Retake one with the `run-on-device` skill's `screenshots.md`.
- **Every claim on a page is true of the build its store links install.** The
  site deploys when `main` changes; the app reaches people only through a store
  release. A page that describes unreleased behaviour waits for that release.
