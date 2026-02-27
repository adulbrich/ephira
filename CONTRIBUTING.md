# Contributing to Ephira

Welcome to the Ephira project! We welcome contributions from our team members and the open-source community. Please follow these guidelines to ensure consistency and quality.

## 1. Prerequisites & Setup

To run the project locally, you need:
* Node.js (LTS version)
* Expo Go app on your physical device (iOS/Android)
* VS Code (recommended) with ESLint/Prettier extensions

### Installation
1.  **Clone the repo:**
    ```bash
    git clone [https://github.com/adulbrich/ephira.git](https://github.com/adulbrich/ephira.git)
    cd ephira
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Start the project:**
    ```bash
    npx expo start
    ```

## 2. Local Quality Checks
Before opening a Pull Request, run these commands to ensure your code meets our standards:

* **Linting:** `npm run lint` (Fixes syntax/style errors)
* **Formatting:** `npm run format` (Ensures code style consistency)
* **Type Check:** `npm run tsc` (Checks TypeScript errors)

## 3. Contribution Workflow

We follow the **Feature Branch Workflow**.

1.  **Create a Branch:**
    * Format: `type/feature-name`
    * Example: `feat/pregnancy-mode-ui` or `fix/calendar-bug`
2.  **Commit Often:**
    * Use descriptive commit messages: "Added toggle for pregnancy mode" (not "fixed stuff").
3.  **Open a Pull Request (PR):**
    * Target the `main` branch.
    * **Description:** Link the GitHub Issue (e.g., "Closes #42").
    * **Screenshots:** Attach a screenshot or video of the feature running on a **physical device**.
4.  **Code Review:**
    * Assign at least one team member to review.
    * Address all comments.
    * **Requirement:** All CI checks (Lint/Build) must pass.

## 4. Definition of Done (DoD)
* [ ] Code compiles/runs without errors on Expo Go (Standard Mode).
* [ ] No linting warnings.
* [ ] Feature satisfies the Acceptance Criteria in the linked Issue.
* [ ] PR has 1 approval.

## 5. Reporting Bugs
Found a bug? Open a **GitHub Issue** with:
* **Title:** Clear description of the error.
* **Steps to Reproduce:** 1. Go to Home, 2. Click X...
* **Environment:** (e.g., iOS 17, iPhone 13).

## 6. Getting Help
* **Team Members:** Post in the iMessage group for quick questions.
* **Docs:** Check the `/docs` folder for architecture decisions.
