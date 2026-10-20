import * as FileSystem from "expo-file-system/legacy";
import * as Notifications from "expo-notifications";
import { deleteAllDataInDatabase } from "@/db/database";
import { EXPORT_FILES } from "@/services/exportFiles";

/**
 * Deletes everything the app keeps on this device: the database, the
 * notifications it has scheduled or is showing, and the files exports leave
 * behind. Settings › Data › Delete Data and the Forgot Password reset both run
 * it, and the privacy policy promises what it does.
 *
 * Every step runs even when an earlier one fails, and each is safe to repeat,
 * so trying again after a rejection finishes the job. The database goes first:
 * a prediction refresh that lands after it finds no flow to schedule from.
 */
export async function deleteAllAppData(): Promise<void> {
  const steps: [string, () => Promise<unknown>][] = [
    ["database", deleteAllDataInDatabase],
    [
      "scheduled notifications",
      Notifications.cancelAllScheduledNotificationsAsync,
    ],
    ["shown notifications", Notifications.dismissAllNotificationsAsync],
    ...Object.entries(EXPORT_FILES).map(
      ([format, uri]): [string, () => Promise<unknown>] => [
        `${format} export`,
        () => FileSystem.deleteAsync(uri, { idempotent: true }),
      ],
    ),
  ];

  const failed: string[] = [];
  for (const [name, step] of steps) {
    try {
      await step();
    } catch (error) {
      console.error(`Delete Data could not delete the ${name}:`, error);
      failed.push(name);
    }
  }

  if (failed.length > 0) {
    throw new Error(`Could not delete the ${failed.join(", ")}`);
  }
}
