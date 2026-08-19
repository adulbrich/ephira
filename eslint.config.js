/**
 * The second, narrow pass. Biome owns linting and formatting for this repo
 * (see `biome.jsonc`); ESLint stays only for what Biome cannot express.
 *
 * Rather than hand-pick the rules to keep, this runs the whole Expo preset and
 * subtracts what Biome already covers. Hand-picking was tried first and was
 * worse: re-declaring `@typescript-eslint/no-require-imports` silently dropped
 * the preset's Metro asset allowlist and its `.ts`-only scope, and broke every
 * CommonJS config file in the repo. The preset knows this framework better
 * than a list maintained here would.
 *
 * What this keeps that Biome has no equivalent for: `import/namespace`, the
 * three `expo/*` rules, `@typescript-eslint/no-require-imports` with Metro's
 * asset allowlist, and the live `react/*` rules.
 */
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

/**
 * Rules Biome owns. Off here so the two tools never disagree and nothing is
 * reported twice.
 *
 * The hooks rules matter most: this repo's suppressions are `biome-ignore`
 * comments, so leaving these on would report at sites that have no
 * `eslint-disable` to quiet them.
 */
const BIOME_OWNED = {
  "react-hooks/exhaustive-deps": "off",
  "react-hooks/rules-of-hooks": "off",
  // Biome: noUnusedVariables, noUnusedImports, noUnusedFunctionParameters.
  "no-unused-vars": "off",
  "@typescript-eslint/no-unused-vars": "off",
  // Biome: noUndeclaredVariables, informed by javascript.globals.
  "no-undef": "off",
};

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: [
      "dist/**",
      "docs/**",
      "drizzle/**",
      "android/**",
      "ios/**",
      ".expo/**",
    ],
  },
  {
    rules: {
      ...BIOME_OWNED,

      // On deliberately, and the reason this file exists at all. It catches a
      // property read off a namespace import that the module does not export,
      // which is how the SDK 54 expo-file-system move broke CSV, JSON and PDF
      // export in a shipped release. Biome has no equivalent, and typecheck
      // only covers the half where the name is absent rather than a shim that
      // throws at runtime.
      "import/namespace": "error",

      // A long-standing repo decision, predating both tools.
      "react/no-unescaped-entities": "off",
    },
  },
]);
