/** The name deleteAllAppData gives its database step. */
export const DATABASE_STEP = "database";

/**
 * Some of Delete Data's steps failed. The database step runs whatever the
 * others did, so whether it went through is what the caller needs: if it did,
 * every screen still holding what it read is out of date.
 *
 * Its own module, free of native imports, so a screen's test can mock the
 * delete and still build one.
 */
export class DeletionIncomplete extends Error {
  readonly databaseDeleted: boolean;

  constructor(readonly failed: string[]) {
    super(`Could not delete the ${failed.join(", ")}`);
    this.name = "DeletionIncomplete";
    this.databaseDeleted = !failed.includes(DATABASE_STEP);
  }
}
