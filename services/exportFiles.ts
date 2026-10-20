import * as FileSystem from "expo-file-system/legacy";

/**
 * Where each export format is written before it goes to the share sheet.
 *
 * The files stay there after sharing, each overwritten by the next export of
 * its format, so Delete Data removes all three. Writers and the delete read
 * the locations from here so they cannot drift apart. All three are in the
 * cache, which iOS does not back up.
 */
export const EXPORT_FILES = {
  csv: `${FileSystem.cacheDirectory}ephira_data.csv`,
  json: `${FileSystem.cacheDirectory}ephira_data.json`,
  pdf: `${FileSystem.cacheDirectory}ephira.pdf`,
} as const;

/**
 * Where older builds wrote the PDF: Documents, which iOS backs up, so a backup
 * held every Day in plaintext beside a database it cannot read. Nothing writes
 * it now, but an install that exported a PDF before the move still has one,
 * so a PDF export and Delete Data both remove it.
 */
export const LEGACY_PDF_EXPORT = `${FileSystem.documentDirectory}ephira.pdf`;
