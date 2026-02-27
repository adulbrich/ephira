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
      "import/namespace": "off",
      "react/no-unescaped-entities": "off",
    },
  },
]);
