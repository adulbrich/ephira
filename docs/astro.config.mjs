// @ts-check
import { defineConfig } from "astro/config";

import tailwind from "@astrojs/tailwind";
import vercelStatic from "@astrojs/vercel/static";

// https://astro.build/config
export default defineConfig({
  site: "https://ephira.capucity.be",
  output: "static",
  adapter: vercelStatic({
    webAnalytics: {
      enabled: false,
    },
  }),
  integrations: [tailwind()],
});
