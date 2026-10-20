import * as FileSystem from "expo-file-system/legacy";
import * as Notifications from "expo-notifications";
import { setHasSeenWalkthrough } from "@/assets/src/onboarding/onboarding-storage";
import { invalidateCatalogue } from "@/db/catalogue";
import { seedCatalogueOnce } from "@/db/database";
import { migrateDatabase, replaceDatabase } from "@/db/operations/setup";
import {
  DATABASE_STEP,
  DeletionIncomplete,
} from "@/services/deletionIncomplete";
import { EXPORT_FILES, LEGACY_PDF_EXPORT } from "@/services/exportFiles";

/** What a step deletes, for the error, and the call that deletes it. */
type Step = [name: string, run: () => Promise<unknown>];

/**
 * Returns the app to a fresh install: a new database file (docs/adr/0005),
 * under a new key unless the key store refuses it, when the old key stays.
 * Everything the user logged, their custom Catalogue items, every setting and
 * the app lock go, and the default Catalogue comes back.
 * It also removes the notifications the app has scheduled or is showing, the
 * files exports leave behind, and the flag saying the walkthrough was seen.
 * Settings › Data › Delete Data and the Forgot Password reset both run it,
 * and the privacy policy promises what it does.
 *
 * Every step runs even when an earlier one fails, and each is safe to repeat,
 * so trying again after a rejection finishes the job. The database goes after
 * the notifications and exports, so a kill before it leaves the data and the
 * lock in place to try again with, rather than an empty database and
 * reminders still due to fire. Only setting up the new file, a last cancel,
 * the walkthrough flag and the Catalogue reseed follow it.
 *
 * One runs at a time, and a call while one runs joins it: two overlapping
 * runs can interleave one's delete with the other's reseed and leave an empty
 * catalogue marked as seeded.
 */
export function deleteAllAppData(): Promise<void> {
  running ??= deleteEverything().finally(() => {
    running = undefined;
  });
  return running;
}

let running: Promise<void> | undefined;

async function deleteEverything(): Promise<void> {
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
    [
      "pdf export an older build left in Documents",
      () => FileSystem.deleteAsync(LEGACY_PDF_EXPORT, { idempotent: true }),
    ],
    [DATABASE_STEP, replaceDatabase],
    // Next, before anything else touches the database: its first use opens
    // the new file, and a failure to open must land in this step. It is not
    // the database step: if it fails, the data is already gone, the app
    // restarts as after a delete, and Try Again replaces the file again.
    ["tables of the new database", migrateDatabase],
    // Again: a prediction refresh that read the flow before the database went
    // can have scheduled since the first cancel. One still scheduling now can
    // land after this too.
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
      console.error(`Delete Data failed at the ${name}:`, error);
      failed.push(name);
    }
  }

  // Only once the database went, so a kill or a failed delete does not replay
  // the walkthrough over the data and the lock.
  if (!failed.includes(DATABASE_STEP)) {
    try {
      await setHasSeenWalkthrough(false);
    } catch (error) {
      console.error("Delete Data could not clear the walkthrough flag:", error);
      failed.push("walkthrough flag");
    }
  }

  // Not a deletion, so not reported as a failed one. If it fails, the next
  // launch seeds the catalogue instead, and like any launch that seeds it
  // deletes every symptom, mood and medication entry: those logged since.
  try {
    await seedCatalogueOnce();
  } catch (error) {
    console.error("Delete Data could not reseed the catalogue:", error);
  }
  invalidateCatalogue();

  if (failed.length > 0) throw new DeletionIncomplete(failed);
}
