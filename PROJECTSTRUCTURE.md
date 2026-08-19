# Project Structure

This document provides an overview of the project structure and key components of the app. It is intended to help contributors understand the organization of the codebase.

## Folder Structure

```text
├── __tests__/                # Root-level tests, and the shared test database helper
├── app/                      # Holds the app entry point, screens, and navigation
├── assets/                   # Images, fonts, videos, icons, etc.
├── components/               # Components grouped by feature/screen/usage
├── constants/                # App-wide constants (colors, TS interfaces, etc.)
├── db/                       # Drizzle database schema and operations
├── docs/                     # Two things: the Astro web page, and the documentation root
├── drizzle/                  # auto-generated Drizzle ORM files
└── hooks/                    # Custom React hooks
```

### `docs/` is both the marketing site and the documentation root

Two unrelated things share that directory, and the name says only one of them. Which half something belongs to:

- **The Astro site that publishes to the web**: `docs/astro.config.mjs`, `docs/src/`, `docs/public/`, `docs/tailwind.config.mjs`, `docs/dist/`, and its own `package.json` and `node_modules/`. Astro builds only `docs/src/pages` and `docs/public`, so the markdown below is invisible to it.
- **The repo's documentation root**: `docs/adr/`, `docs/agents/`, `docs/plans/`, `docs/CYCLE_PREDICTION_FALLBACK_LOGIC.md` and `docs/CYCLE_PREDICTION_TEST_PLAN.md`.

**An architecture decision record goes in `docs/adr/`**, numbered in sequence (`0003-...`) and following the format of the two already there. Write one when you make a decision a future reader would otherwise re-litigate. Implementation plans go in `docs/plans/`, and the instructions the agent skills read go in `docs/agents/`.

Documentation never goes under `docs/src/`. That is the website.

## Key Components

### `/app/_layout.tsx`

- Entry point of the app.
- Sets up the app's main layout and navigation structure.
- Authenticates user if needed and loads initial data/sets up database.

### `/app/(tabs)/_layout.tsx`

- Defines the bottom tab navigator layout and screens/icons.

### `/app/(tabs)/index.tsx`

- Home screen of the app.
- Displays flow circle and recent flow dates if available.

### `/app/(tabs)/calendar.tsx`

- Calendar powered by [`react-native-calendars`](https://www.npmjs.com/package/react-native-calendars).
- Allows user to select dates and enter flow, symptoms, moods, etc. for the selected date.
- User can choose up to three types of entries to display on the calendar.
- Day View component underneath calendar shows selected date's entries and allows user to edit them.

### `/app/(tabs)/settings.tsx`

- Settings screen for the app.
- Allows user to change app settings, such as:
  - Color scheme
  - Authentication
  - Export/Delete data
  - Customize entries
  - etc.
- See `/components/settings/` folder for individual components.

### `/stores/calendar-storage.tsx`

- Zustand store for cycle-mode app state. `/stores/pregnancy-storage.tsx` is its pregnancy-mode counterpart; see `docs/adr/0001-keep-cycle-and-pregnancy-modes-separate.md` for why they are separate.

### `/components/dayView/DayView.tsx`

- Main component for the DayView logic, which sits underneath the calendar on the Calendar screen.
- Displays the selected date's entries and allows users to edit them.
- Holds no rules: `db/loggedDay.ts` owns loading and saving a Logged Day, including the debounce and its guards, and `db/catalogue.ts` owns what the user can choose from.

### `/db/`

- Contains the [Drizzle (Expo SQLite)](https://orm.drizzle.team/docs/connect-expo-sqlite) database schema and operations, which are separated by table in the `/db/operatiosn/` folder.
- Drizzle handles schema migrations automatically using their [CLI tool](https://orm.drizzle.team/docs/connect-expo-sqlite#generate-migrations) and stores the files in the `/drizzle/` folder - don't edit these files directly.
- **Data** migrations are the exception. drizzle-kit generates DDL from the schema and has nothing to say about the rows already on a user's device, so a migration that repairs or moves data is written by hand: add the `.sql` file, an entry in `drizzle/meta/_journal.json`, a snapshot copied from the previous one with a fresh `id`, and the import in `drizzle/migrations.js`. See `docs/adr/0002-hand-written-data-migrations.md`.

### `/hooks/`

- `useFetchEntries.ts`
  - Fetches symptom or mood entries for a given date.
- `useFetchFlowData.ts`
  - Fetches flow data for use in the homepage animated circle.
- `useFetchMedicationEntries.ts`
  - Fetches medication entries for a given date, separates them by type (currently only either "birth control" or not).
- `useLiveFilteredData.ts`
  - Fetches live data via [Drizzle's useLiveQuery](https://orm.drizzle.team/docs/connect-expo-sqlite#live-queries) function from the database based on the given filters and organizes it into a format suitable for use in `useMarkedDates.ts`.
- `useMarkedDates.ts`
  - Makes the [markedDates](https://wix.github.io/react-native-calendars/docs/Components/Calendar#markeddates) object for the calendar based on the user's calendar filters.
  - Utilizes `useLiveFilteredData.ts` to get the filtered data as it changes and updates the markedDates.
- `useSyncEntries.ts`
  - Syncs entries for the selected date with the database.
- `useSyncMedicationEntries.ts`
  - Syncs medication entries for the selected date with the database.

## Tools & Libraries

- [Expo](https://docs.expo.dev/) - RN Framework
- [React Native (RN)](https://reactnative.dev/docs/getting-started)
- [React Native Paper](https://reactnativepaper.com) - Material Design Library
- [Drizzle](https://orm.drizzle.team/docs/connect-expo-sqlite) - Database
- [pdf-lib](https://pdf-lib.js.org/) - PDF generation for data export
- [react-native-calendars](https://wix.github.io/react-native-calendars/docs/Intro) - Calendar
- [Zustand](https://zustand.docs.pmnd.rs/getting-started/introduction) - State Management

## Setup

Due to using Expo SQLite for the database, this project will only run on mobile devices or emulators.

- Clone the repo
- `npm install` (Node.js LTS recommended)
- `npx expo start`

In the output, you'll find options to open the app in a:

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo
  - If you get an error about the app not being able to connect or taking longer than it should, try running `npx expo start --tunnel` in the terminal and scanning the QR code again.

This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Testing

Run once with `npm test`, or `npm run test:watch` while working. `npm run typecheck` runs `tsc --noEmit`. `npm run lint` runs Biome, which does both linting and formatting, followed by a narrow ESLint pass for the handful of Expo and import rules Biome cannot express (see the header of `eslint.config.js`). All three run on every pull request via `.github/workflows/format-test.yml`; `npm run format` fixes what is fixable.

Tests live in `__tests__/` folders beside the code they cover, and must be named `*.test.ts` or `*.test.tsx`. Anything else under `__tests__/` is treated as a helper, not a suite.

### Testing code that touches the database

Tests run against a real in-memory SQLite database rather than a fake, using `better-sqlite3` with the checked-in `drizzle/` migrations applied. Substitute the database handle at the single specifier every `db/operations/*.ts` file reaches it through:

```ts
import { resetTestDatabase } from "@/__tests__/helpers/testDatabase";
import { insertDay } from "@/db/operations/days";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

beforeEach(() => {
  resetTestDatabase();
});
```

Babel hoists `jest.mock` above the imports wherever it is written, so it takes effect before the module-level `const db = getDrizzleDatabase()` in each operations file evaluates. With it in place `expo-sqlite` is never loaded, so no production code needs to change to be testable.

Two things worth knowing:

- **Foreign keys are ON in tests**, deliberately stricter than the device, which has no `PRAGMA foreign_keys` anywhere and so runs with them off. A delete that orphans child rows passes on device and fails here. That is the point; do not turn them off to make a test pass.
- **The handle is per test file**, because those module-level captures happen once per module registry. Isolation between tests comes from `resetTestDatabase()`, which empties every table and leaves the schema in place.

Live queries are out of scope: `useLiveQuery` is not exercised, so `hooks/useLiveFilteredData.ts` and `hooks/usePregnancyMarkedDates.ts` are not covered by this setup.

## CI/CD

Ephira is currently published on both Google Play and the Apple App Store. The app is built using [EAS Build](https://docs.expo.dev/build/introduction/), which can be manually triggered via [this Github Action](https://github.com/adulbrich/ephira/actions/workflows/manual-eas-build.yml). After building, the app must be submitted to the app stores manually through their respective developer consoles.
