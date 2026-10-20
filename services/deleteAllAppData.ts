import * as FileSystem from "expo-file-system/legacy";
import * as Notifications from "expo-notifications";
import { invalidateCatalogue } from "@/db/catalogue";
import { deleteAllDataInDatabase, seedEntryTypesOnce } from "@/db/database";
import { EXPORT_FILES } from "@/services/exportFiles";

/** What a step deletes, for the error, and the call that deletes it. */
type Step = [name: string, run: () => Promise<unknown>];

/**
 * Deletes the user's data from this device: every row in the database, the
 * notifications the app has scheduled or is showing, and the files exports
 * leave behind. Settings › Data › Delete Data and the Forgot Password reset
 * both run it, and the privacy policy promises what it does. It leaves the
 * database key (docs/adr/0005) and the flag saying the walkthrough was seen,
 * and the database as a fresh install has it: the default catalogue and
 * nothing the user entered.
 *
 * Every step runs even when an earlier one fails, and each is safe to repeat,
 * so trying again after a rejection finishes the job. The database goes last,
 * so a kill part-way leaves the data and the lock in place to try again with,
 * rather than an empty database and reminders still due to fire.
 */
export async function deleteAllAppData(): Promise<void> {
  const steps: Step[] = [
    [
      "scheduled notifications",
      Notifications.cancelAllScheduledNotificationsAsync,
    ],
    ["shown notifications", Notifications.dismissAllNotificationsAsync],
    ...Object.entries(EXPORT_FILES).map(
      ([format, uri]): Step => [
        `${format} export`,
        () => FileSystem.deleteAsync(uri, { idempotent: true }),
      ],
    ),
    ["database", deleteAllDataInDatabase],
    // Again: a prediction refresh that read the flow before the database went
    // can have scheduled since the first cancel. None can after it.
    [
      "notifications scheduled during the delete",
      Notifications.cancelAllScheduledNotificationsAsync,
    ],
  ];

  const failed: string[] = [];
  for (const [name, run] of steps) {
    try {
      await run();
    } catch (error) {
      console.error(`Delete Data could not delete the ${name}:`, error);
      failed.push(name);
    }
  }

  // Not a deletion, so not a failure of one: if it fails, the next launch
  // seeds the catalogue instead, as it does on a fresh install.
  try {
    await seedEntryTypesOnce();
  } catch (error) {
    console.error("Delete Data could not reseed the catalogue:", error);
  }
  invalidateCatalogue();

  if (failed.length > 0) {
    throw new Error(`Could not delete the ${failed.join(", ")}`);
  }
}
