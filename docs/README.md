# ephira docs

Two unrelated things share this directory, and the name says only one of them.

- **The website**: the Astro site that publishes the landing page and the
  privacy policy: `astro.config.mjs`, `src/`, `public/`, and its own
  `package.json`. Astro builds only `src/pages` and `public`, so the markdown
  beside them is invisible to it.
- **The repo's documentation**: `adr/`, `agents/`, `plans/` and the
  `CYCLE_PREDICTION_*.md` files.

An architecture decision record goes in `adr/`, numbered in sequence, when a
decision would otherwise be re-litigated. Implementation plans go in `plans/`,
and the instructions the agent skills read go in `agents/`. Documentation never
goes under `src/`: that is the website.

The rest of this file is about the website.

## Stack

- [astro](https://docs.astro.build/en/getting-started/)
- [tailwindcss](https://tailwindcss.com/)
- [tailwind typography](https://github.com/tailwindlabs/tailwindcss-typography)

`npm audit` reports 3 high advisories, all one `path-to-regexp` issue counted
through `@astrojs/vercel` → `@vercel/routing-utils`, which pins it to exactly
`6.1.0` with no caret, including in its newest release. No upgrade clears it,
and `npm audit fix --force` "fixes" it by downgrading `@astrojs/vercel` two
majors. The site is `output: "static"` and fully prerendered, so no Astro
request handler runs in production and the advisory is build-time only.

## Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/
│   │   └── screens/
│   ├── components/
│   │   ├── Footer.astro
│   │   ├── Header.astro
│   │   ├── Shot.astro
│   │   └── StoreBadges.astro
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   ├── contact.astro
│   │   ├── index.astro
│   │   └── privacy.astro
│   └── styles/
│       └── global.css
└── package.json
```

Requires Node 22.12 or newer, which `engines` in `package.json` states so that
Vercel picks a runtime that can build it.

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

In our case, the `Layout.astro` file is imported in both `index.astro` and `privacy.astro`, which applies the layout to all these pages (i.e., wraps these pages).

The `Layout.astro` imports the `Header.astro` and `Footer.astro`, and defines page meta attributes (title, description), favicon, etc.

We use the `prose` tailwindcss typography class in `privacy.astro` to make it look nicer to read without applying much styling.

`global.css` is Tailwind's entry point and `Layout.astro` imports it. Tailwind 4
dropped the Astro integration in favour of a Vite plugin, which does not inject
the stylesheet for you: remove that import and every page still builds and still
deploys, with no styles at all.

The brand colours live once, in `global.css`'s `@theme` block, and pages use
them as utilities (`bg-plum-950`, `text-cream`). Add a colour there rather than
writing its hex into a class.

## Screenshots

The landing page shows stills, not video: the screen recordings it used to
autoplay cost a visitor about 47 MB. `src/assets/screens/` holds one WebP per
screen at 959 px wide, and `Shot.astro` asks Astro for 360 and 720 px AVIF and
WebP copies, so a phone downloads only what fits its screen. Anything under
`public/` skips that step and ships byte for byte, so images go in `src/assets`.

They were captured on an iOS simulator with fictional demo data. No seed script
is committed: the data came from a throwaway module that calls the
`db/operations` insert helpers, imported in `app/_layout.tsx` right after
`setupEntryTypes()` and guarded to run once per JavaScript context, because that
effect fires twice and a second run hits the unique index on `symptoms.name`. To
retake one,
use the `run-on-device` skill, set a clean status bar first, and capture with
`simctl` rather than a window screenshot:

```sh
xcrun simctl status_bar <udid> override --time 9:41 --batteryState charged --batteryLevel 100
xcrun simctl io <udid> screenshot shot.png
sips -Z 2077 shot.png --out shot-small.png
cwebp -q 88 shot-small.png -o src/assets/screens/<name>.webp
```

Never use real data in a screenshot: the repository and the site are public.

## Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## Deploys

Vercel deploys this site from every push: previews from pull requests,
production from `main`. Before it installs anything, `vercel.json` runs
`ignored-build-step.sh`, which cancels the deployment when the website is the
same as at the branch's last successful deployment or, before it has one, the
same as on `main`. Its header says what counts as the website.

A dashboard Redeploy runs that step too, and cancels. To force a rebuild,
untick "Use project's Ignore Build Step" in the Redeploy dialog. The footer's
year is rendered at build time, so after New Year it stays behind until the
next website change or a forced Redeploy.
