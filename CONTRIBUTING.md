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
   clone. The tracked `.claude/settings.json` enables it but does not fetch it,
   and the local scope records the install in your untracked
   `.claude/settings.local.json`:

   ```bash
   claude plugin install mattpocock-skills@claude-plugins-official --scope local
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

Before opening a Pull Request, run what CI runs. Lefthook runs most of it for
you at commit and push; "The gates" below says which.

- **Lint and format:** `npm run lint` (`npm run format` fixes what is fixable)
- **Type check:** `npm run typecheck`
- **Tests:** `npm test`
- **Prose:** `npm run check:prose` (no emdash, no emoji)

## 3. Contribution Workflow

We follow the **Feature Branch Workflow**.

1.  **Create a Branch:**
    - Format: `type/feature-name`
    - Example: `feat/pregnancy-mode-ui` or `fix/calendar-bug`
    - Name it right before opening the PR: renaming a PR's head branch
      deletes the old ref, and GitHub closes the PR.
2.  **Commit Often:**
    - [Conventional Commits](https://www.conventionalcommits.org/) with a
      lowercase imperative subject: `fix(calendar): keep the open Section on close`.
      Types: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `perf`,
      `build`, `ci`, `chore`; the scope is optional.
    - The body, if any, says why in a sentence or two.
    - Stage files by name, so a commit carries only what you meant.
3.  **Open a Pull Request (PR):**
    - Target the `main` branch.
    - **Description:** Link the GitHub Issue (e.g., "Closes #42").
    - **Screenshots:** a PR that touches `app/`, `components/`, `assets/` or a
      theme carries a screenshot or video of the change on a simulator, an
      emulator or a device (iOS and Android when the change is
      platform-specific), or the line `Screenshots: none, because <reason>`.
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
docs, a workflow is configuration, and a dependency is supply chain. Dependabot
rewrites its own PR body, so on its PRs the record goes in a comment.

Repeat until a pass raises nothing you have not answered. Answered means fixed,
or declined in writing with the reason. A fix is new code, so the loop ends when
each of the three reviews has a clean pass on the newest commit that is not a
clean update from `main`. A clean update leaves the PR's three-dot diff
unchanged and needs no new pass; one that resolved a conflict does. Update a
branch with a merge, never a rebase, so the commit the passes saw stays in it. Verify a
finding before acting on it: reviewers are sometimes confidently wrong. Record
each review's pass count, the commit the last passes saw, and every decline in
the PR.

### The gates

One script per rule, run at the earliest point that can see the violation. The
first column stops you locally; the last stops the merge.

| Rule | Local (lefthook) | Claude Code hook | CI |
| --- | --- | --- | --- |
| Conventional subject; no emdash, emoji or session link in a commit message | `commit-msg` | `guard-git` reads the message first | `Checks` walks the PR's commits |
| No emdash or emoji in tracked text | `pre-commit`, staged files | `after-edit`, the edited file | `Checks`: `npm run check:prose` |
| No session link, emdash or emoji in PR, issue, review, comment or release text | (never sees it) | `guard-gh` refuses the command, body files included; it warns on a file it cannot read | `pr-text`, the PR title and body |
| A UI change carries a screenshot, or a reason | | `guard-gh` warns | `pr-text` |
| The PR body records the review loop's pass counts and last commit | | `guard-gh` warns | `pr-text` (the record, not the reviews) |
| Stage by name; never commit on `main` | `pre-commit` branch check | `guard-git` | the ruleset refuses a push to `main` |
| No force push at `main`, `reset --hard`, `clean -f`, `branch -D` | | `guard-git` | the ruleset refuses a force push |
| Generated files, signing material and shipped migrations stay untouched | | `guard-edits` | |
| No branch rename through the API (it closes the PR the branch heads) | | `guard-gh` | |
| A migration's journal entry, `.sql` file, import and snapshot agree | `pre-commit`, when `drizzle/` is staged | | `Checks` |
| Every modal answers hardware Back, or is listed with the reason it does not | `pre-push`, with the tests | | `Checks`: `components/__tests__/modalBack.test.ts` |
| Biome clean | `pre-commit`, staged files | `after-edit` | `Checks` |
| ESLint, typecheck and tests green | `pre-push` (typecheck, tests) | | `Checks` |

`Checks` reports as **`Lint, typecheck and test`**. It and `pr-text` are
required on `main`, the branch must be up to date with `main` before it merges,
and `Checks` runs again on `main` after every merge. The hooks live in
`.claude/hooks/` and the scripts in `scripts/`. `npm install` installs the
lefthook hooks; where it cannot (no git, say), it says so and carries on, and
`npx lefthook install` does it by hand.

Skipping locally (`LEFTHOOK=0 git commit`, or `--no-verify`) moves the failure
to the hooks and CI rather than removing it.

## 4. Definition of Done (DoD)

- [ ] Runs without errors on a simulator, emulator or device.
- [ ] `npm run lint`, `npm run typecheck` and `npm test` all pass.
- [ ] Feature satisfies the Acceptance Criteria in the linked Issue.
- [ ] The review loop is recorded in the PR.

## 5. Releasing

Ephira is published on Google Play and the App Store, built with
[EAS Build](https://docs.expo.dev/build/introduction/).

1. A PR that needs a store build bumps `expo.version` in `app.json`
   (MAJOR.MINOR.PATCH); the PR template's build reminder asks the reviewer to
   confirm it.
2. After it merges, run **Manual Expo EAS Build** (Actions, then Run workflow,
   then pick the platforms). It builds on EAS with the `production` profile.
3. Submit each build to its store by hand from the developer console.

## 6. Reporting Bugs

Found a bug? Open a **GitHub Issue** with:

- **Title:** Clear description of the error.
- **Steps to Reproduce:** 1. Go to Home, 2. Click X...
- **Environment:** (e.g., iOS 17, iPhone 13).

## 7. Getting Help

- **Team Members:** Post in the iMessage group for quick questions.
- **Docs:** decisions are in `docs/adr/`; `docs/README.md` says what else lives
  in `docs/`. Rules for one directory sit in that directory's `AGENTS.md`
  (`db/`, `hooks/`), and the testing guide is `__tests__/README.md`.
