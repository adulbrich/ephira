// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
// @astrojs/vercel v9 collapsed the /static and /serverless sub-imports into
// one adapter that reads `output` instead.
import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  site: "https://ephira.capucity.be",
  // Astro 7 defaults this to "jsx", which strips whitespace between inline
  // elements. In hand-written HTML that whitespace is a word separator: it
  // rendered "ourGitHub" and "spyware.ephira" on this site. JSX semantics are
  // wrong for prose, so keep the v6 behaviour.
  compressHTML: true,
  output: "static",
  adapter: vercel({
    // Omitting this is equivalent -- the adapter checks `webAnalytics?.enabled`
    // -- but a period tracker should say out loud that it loads no analytics.
    webAnalytics: {
      enabled: false,
    },
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});
