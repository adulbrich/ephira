# Contributing to Ephira

Welcome to the Ephira project! We welcome contributions from our team members and the open-source community. Please follow these guidelines to ensure consistency and quality.

## 1. Prerequisites & Setup

**This project cannot run in Expo Go.** It uses config plugins that change the
native projects, and Expo Go ships one fixed native runtime that has none of
them:

- `expo-sqlite` with `useSQLCipher: true` — an encrypted SQLite build, not the
  stock library Expo Go carries
- `expo-local-authentication` — needs `NSFaceIDUsageDescription` in an
  `Info.plist` that is ours
- `plugins/withAndroid16KBSupport.js` — a local config plugin, so by definition
  not compiled into anything published

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

3. **Build and run:**

   ```bash
   npm run ios      # or: npm run android
   ```

   This runs `expo run:ios`, which generates the native projects with
   [`expo prebuild`](https://docs.expo.dev/workflow/prebuild/) and compiles a
   development build. **The first run is slow** — it compiles every native
   dependency from scratch. Later runs are incremental.

4. **Day to day:**

   ```bash
   npm start
   ```

   Once a development build is installed, `expo start` is all a JavaScript
   change needs. Rebuild only when something native changes: a dependency with
   native code, anything in `app.json`, or anything in `plugins/`.

`/ios` and `/android` are generated output and are gitignored. Edit `app.json`
and `plugins/` instead; prebuild rebuilds the native projects from them.

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
4.  **Code Review:**
    - Assign at least one team member to review.
    - Address all comments.
    - **Requirement:** All CI checks must pass (lint, typecheck, tests).

## 4. Definition of Done (DoD)

- [ ] Runs without errors on a simulator, emulator or device.
- [ ] `npm run lint`, `npm run typecheck` and `npm test` all pass.
- [ ] Feature satisfies the Acceptance Criteria in the linked Issue.
- [ ] PR has 1 approval.

## 5. Reporting Bugs

Found a bug? Open a **GitHub Issue** with:

- **Title:** Clear description of the error.
- **Steps to Reproduce:** 1. Go to Home, 2. Click X...
- **Environment:** (e.g., iOS 17, iPhone 13).

## 6. Getting Help

- **Team Members:** Post in the iMessage group for quick questions.
- **Docs:** Check the `/docs` folder for architecture decisions.
