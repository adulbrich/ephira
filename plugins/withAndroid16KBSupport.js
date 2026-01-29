const { withGradleProperties } = require("@expo/config-plugins");

/**
 * Expo Config Plugin to add 16KB page size support for Android 15+
 * This ensures the app works correctly on devices with 16KB memory pages
 */
const withAndroid16KBSupport = (config) => {
  return withGradleProperties(config, (config) => {
    // Add gradle properties for 16KB page size support
    config.modResults = config.modResults.filter(
      (item) =>
        item.key !== "android.bundle.enableUncompressedNativeLibs" &&
        item.key !== "android.useAndroidX" &&
        item.key !== "android.enableJetifier",
    );

    config.modResults.push(
      {
        type: "property",
        key: "android.useAndroidX",
        value: "true",
      },
      {
        type: "property",
        key: "android.enableJetifier",
        value: "true",
      },
      {
        type: "property",
        key: "android.bundle.enableUncompressedNativeLibs",
        value: "false",
      },
    );

    return config;
  });
};

module.exports = withAndroid16KBSupport;
