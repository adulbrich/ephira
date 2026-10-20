import {
  DATABASE_STEP,
  DeletionIncomplete,
  databaseMayBeGone,
} from "@/services/deletionIncomplete";

describe("databaseMayBeGone", () => {
  it("is false only when the failure names the database step", () => {
    expect(databaseMayBeGone(new DeletionIncomplete([DATABASE_STEP]))).toBe(
      false,
    );
    expect(databaseMayBeGone(new DeletionIncomplete(["csv export"]))).toBe(
      true,
    );
  });

  it("assumes the worst of a failure that does not say", () => {
    // Screens left holding deleted rows would write them back; a restart
    // after a rollback only costs the typed confirmation.
    expect(databaseMayBeGone(new Error("unexpected"))).toBe(true);
    expect(databaseMayBeGone(undefined)).toBe(true);
  });
});
