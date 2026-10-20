import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PRIVACY_POLICY_URL } from "@/components/settings/PrivacyPolicy";

const DOCS = join(__dirname, "../../../docs");

// The website's page is the app's only copy of the policy, so a renamed route
// or a changed domain would leave the app linking to nothing.
it("links to the policy page on the website's own domain", () => {
  const url = new URL(PRIVACY_POLICY_URL);
  const config = readFileSync(join(DOCS, "astro.config.mjs"), "utf8");
  const site = config.match(/site:\s*["']([^"']+)["']/)?.[1];

  expect(site && new URL(site).origin).toBe(url.origin);
  expect(url.pathname).toBe("/privacy");
  expect(readdirSync(join(DOCS, "src/pages"))).toContain("privacy.astro");
});
