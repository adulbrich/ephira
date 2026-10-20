import { existsSync } from "node:fs";
import { join } from "node:path";
import { PRIVACY_POLICY_URL } from "@/components/settings/PrivacyPolicy";

// The website's page is the app's only copy of the policy, so a renamed route
// would leave the app linking to nothing.
it("links to a page the website builds", () => {
  const { pathname } = new URL(PRIVACY_POLICY_URL);
  expect(
    existsSync(join(__dirname, "../../../docs/src/pages", `${pathname}.astro`)),
  ).toBe(true);
});
