# Testing an upgrade from 1.4.0

The first launch of a build newer than 1.4.0 finds the plaintext `ephira.db` and
encrypts it into `ephira.encrypted.db` (`db/databaseFile.ts`, docs/adr/0005).

- **iOS:** keep a simulator with 1.4.0 installed and data entered as a fixture.
  Clone it while shut down (`xcrun simctl clone`) and install the new build over
  the clone, so the fixture stays at 1.4.0.
- **Android without a 1.4.0 APK:** the plaintext `ephira.db` a 1.4.0 install writes
  is a plain SQLite file. Install the new APK and push the file into
  `files/SQLite/ephira.db` with `run-as` (see [android.md](android.md)) before the
  first launch, then launch. If the app has ever run on that emulator, clear it
  first (`adb shell pm clear com.capucity.ephira`): an `ephira.encrypted.db`
  already there is the truth, and the launch deletes the pushed file as a
  leftover instead of upgrading it.
- **A 1.4.0 Debug build needs 1.4.0's JavaScript:** run Metro from a detached
  worktree at `749b54f`, the 1.4.0 release merge, on a port of its own. Remove the
  worktree afterwards with `git worktree remove`.

The test passes when `ephira.encrypted.db` does not begin with the bytes
`SQLite format 3\0`, the plaintext file is gone, and the entered data shows in the
app. Kill the app between upgrade steps and relaunch to see that it resumes;
`db/__tests__/databaseFile.test.ts` names the steps.
