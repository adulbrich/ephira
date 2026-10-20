import * as FileSystem from "expo-file-system/legacy";

/**
 * Where each export format is written before it goes to the share sheet.
 *
 * The files stay there after sharing, each overwritten by the next export of
 * its format, so Delete Data removes all three. Writers and the delete read
 * the locations from here so they cannot drift apart.
 */
export const EXPORT_FILES = {
  csv: `${FileSystem.cacheDirectory}ephira_data.csv`,
  json: `${FileSystem.cacheDirectory}ephira_data.json`,
  pdf: `${FileSystem.documentDirectory}ephira.pdf`,
} as const;
