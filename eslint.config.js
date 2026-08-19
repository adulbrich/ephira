const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const prettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = defineConfig([
  ...expoConfig,
  prettierRecommended,
  {
    ignores: ["dist/**", "docs/**"],
  },
  {
    rules: {
      "prettier/prettier": "error",
      // On deliberately. This is the rule that catches a property read off a
      // namespace import that the module does not export, which is exactly
      // how the SDK 54 upgrade broke CSV, JSON and PDF export in a shipped
      // release: expo-file-system moved cacheDirectory and EncodingType to
      // its /legacy entry point and nothing complained. It was switched off
      // globally at the time; the repo has no findings under it now.
      "import/namespace": "error",
      "react/no-unescaped-entities": "off",
    },
  },
]);
