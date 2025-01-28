# Docs

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
│   └── pages/
│       ├── index.astro
│       └── privacy.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

In our case, the `Layout.astro` file is imported in both `index.astro` and `privacy.astro`, which applies the layout to all these pages (i.e., wraps these pages).

The `Layout.astro` imports the `Header.astro` and `Footer.astro`, and defines page meta attributes (title, description), favicon, etc.

We use the `prose` tailwindcss typography class in `privacy.astro` to make it look nicer to read without applying much styling.

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
