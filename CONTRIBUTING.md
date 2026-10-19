# Contributing to Ephira

Welcome to the Ephira project! We welcome contributions from our team members and the open-source community. Please follow these guidelines to ensure consistency and quality.

## 1. Prerequisites & Setup

**This project cannot run in Expo Go.** It uses config plugins that change the
native projects, and Expo Go ships one fixed native runtime that has none of
them:

- `expo-sqlite` with `useSQLCipher: true`: an encrypted SQLite build, not the
  stock library Expo Go carries
- `expo-local-authentication`: needs `NSFaceIDUsageDescription` in an
  `Info.plist` that is ours

You need a **development build** on a simulator, an emulator or a device. To
run it locally you need:

- Node.js (LTS version)
- Xcode with a simulator (iOS), or Android Studio with an emulator (Android)
- CocoaPods, for the iOS build
- VS Code (recommended)

### Installation

1. **Clone the repo:**

   ```bash
   git clone https://github.com/adulbrich/ephira.git
   cd ephira
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

   If you use Claude Code, install the plugin the review loop runs once per
   clone. The tracked `.claude/settings.json` enables it but does not fetch it:

   ```bash
   claude plugin install mattpocock-skills@claude-plugins-official --scope project
   ```

3. **Build and run:**

   ```bash
   npm run ios      # or: npm run android
   ```

   For Android, **start the emulator first and let it finish booting.**
   `expo run:android` installs over adb, and adb reports
   `cmd: Can't find service: package` if the package manager is not up yet.
   `adb shell getprop sys.boot_completed` returns `1` when it is ready.

   Android also needs `ANDROID_HOME` pointing at your SDK. Android Studio sets
   it; a shell that has never run it may not have it.

   This runs `expo run:ios`, which generates the native projects with
   [`expo prebuild`](https://docs.expo.dev/workflow/prebuild/) and compiles a
   development build. **The first run is slow**: it compiles every native
   dependency from scratch. Later runs are incremental.

4. **Day to day:**

   ```bash
   npm start
   ```

   Once a development build is installed, `expo start` is all a JavaScript
   change needs. Rebuild only when something native changes: a dependency with
   native code, or anything in `app.json`, including its `plugins` list.

`/ios` and `/android` are generated output and are gitignored. Edit `app.json`
instead; prebuild rebuilds the native projects from it.

## 2. Local Quality Checks

Before opening a Pull Request, run what CI runs:

- **Lint and format:** `npm run lint` (`npm run format` fixes what is fixable)
- **Type check:** `npm run typecheck`
- **Tests:** `npm test`

## 3. Contribution Workflow

We follow the **Feature Branch Workflow**.

1.  **Create a Branch:**
    - Format: `type/feature-name`
    - Example: `feat/pregnancy-mode-ui` or `fix/calendar-bug`
2.  **Commit Often:**
    - Use descriptive commit messages: "Added toggle for pregnancy mode" (not "fixed stuff").
3.  **Open a Pull Request (PR):**
    - Target the `main` branch.
    - **Description:** Link the GitHub Issue (e.g., "Closes #42").
    - **Screenshots:** Attach a screenshot or video of the feature running on a **physical device**.
4.  **Code Review:** the review loop below, then merge with a merge commit.
    The branch is deleted on merge.

### The review loop

The ruleset requires no approving review while the project has one maintainer,
and green CI is not a review, so this loop is the review. A teammate's review is
welcome on top of it, never instead of it.

Every PR runs three reviews against `origin/main`:

| Review | Asks |
| --- | --- |
| `mattpocock-skills:code-review` | Does the diff follow the repo's standards and the linked issue? |
| `correctness-review` (`.claude/skills/`) | What input or sequence breaks it? |
| `app-security-review` (`.claude/skills/`) | Can health data, the database key or the lock leak or fail open? |

All three run on docs-only diffs and dependency bumps too: the privacy policy is
docs, a workflow is configuration, and a dependency is supply chain.

Repeat until a pass raises nothing you have not answered. Answered means fixed,
or declined in writing with the reason. A fix is new code, so the loop ends on a
pass that ran on the commit that merges; updating the branch from `main` needs
no new pass unless it resolved a conflict. Verify a finding before acting on
it: reviewers are sometimes confidently wrong. Record each review's pass count,
the commit the last pass saw, and every decline in the PR.

### What blocks a merge

- **`Lint, typecheck and test`** is a required check on `main`, and the branch
  must be up to date with `main` before it merges. The same check runs again on
  `main` after every merge.
- Force pushes to `main` and deleting it are refused.

## 4. Definition of Done (DoD)

- [ ] Runs without errors on a simulator, emulator or device.
- [ ] `npm run lint`, `npm run typecheck` and `npm test` all pass.
- [ ] Feature satisfies the Acceptance Criteria in the linked Issue.
- [ ] The review loop is recorded in the PR.

## 5. Reporting Bugs

Found a bug? Open a **GitHub Issue** with:

- **Title:** Clear description of the error.
- **Steps to Reproduce:** 1. Go to Home, 2. Click X...
- **Environment:** (e.g., iOS 17, iPhone 13).

## 6. Getting Help

- **Team Members:** Post in the iMessage group for quick questions.
- **Docs:** Check the `/docs` folder for architecture decisions.
