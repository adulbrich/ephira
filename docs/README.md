# ephira docs

Landing page, future documentation, privacy policy.

## Stack

- [astro](https://docs.astro.build/en/getting-started/)
- [tailwindcss](https://tailwindcss.com/)
- [tailwind typography](https://github.com/tailwindlabs/tailwindcss-typography)
- [heroicons](https://heroicons.com/)

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── Header.astro
│   │   └── Footer.astro
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

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |
