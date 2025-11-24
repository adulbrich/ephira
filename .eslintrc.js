// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: ["expo", "prettier"],
  ignorePatterns: ["/dist/*"],
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "error",
    "import/namespace": "off", // added to remove namespace erros for components/settings/PdfBuilder.ts + ExportData.tsx
  },
};
