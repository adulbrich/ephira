# Project Structure

This document provides an overview of the project structure and key components of the app. It is intended to help contributors understand the organization of the codebase.

## Folder Structure

```
├── app/                      # Holds the app entry point, screens, and navigation
├── assets/                   # Images, fonts, videos, icons, etc. and Zustand store
├── components/               # Components grouped by feature/screen/usage
├── constants/                # App-wide constants (colors, fonts, etc.)
├── constants/                # Constants (colors, TS interfaces, etc.)
├── db/                       # Drizzle database schema and operations
├── docs/                     # Astro web page
├── drizzle/                  # auto-generated Drizzle ORM files
└── hooks/                    # Custom React hooks
```

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

### `/assets/src/calendar-storage.tsx`

- Zustand store for managing app state.

### `/components/dayView/DayView.tsx`

- Main component for the DayView logic, which sits underneath the calendar on the Calendar screen.
- Displays the selected date's entries and allows users to edit them.

### `/db/`

- Contains the [Drizzle (Expo SQLite)](https://orm.drizzle.team/docs/connect-expo-sqlite) database schema and operations, which are separated by table in the `/db/operatiosn/` folder.
- Drizzle handles schema migrations automatically using their [CLI tool](https://orm.drizzle.team/docs/connect-expo-sqlite#generate-migrations) and stores the files in the `/drizzle/` folder - don't edit these files directly.

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
- [React Native](https://reactnative.dev/docs/getting-started)
- [React Native Paper]() - UI
- [Drizzle](https://orm.drizzle.team/docs/connect-expo-sqlite) - Database
- [pdf-lib](https://pdf-lib.js.org/) - PDF generation for data export
- [react-native-calendars](https://wix.github.io/react-native-calendars/docs/Intro) - Calendar
- [Zustand](https://zustand.docs.pmnd.rs/getting-started/introduction) - State Management

### Setup

- Install dependencies
- Download Expo Go app on your phone
- Run `npx expo start` in the terminal
- Scan the QR code with the Expo Go app (for Android), camera (for iOS), or enter the URL in the app (for emulator/iOS/Android)
  - If you get an error about the app not being able to connect or taking longer than it should, try running `npx expo start --tunnel` in the terminal and scanning the QR code again.
