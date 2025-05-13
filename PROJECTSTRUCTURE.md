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
- Day View underneath calendar shows selected date's entries and allows user to edit them.
