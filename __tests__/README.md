# Testing

`npm test` runs Jest once; `npm run test:watch` while you work. Tests live in
`__tests__/` folders beside the code they cover and are named `*.test.ts` or
`*.test.tsx`; anything else under `__tests__/` is a helper, not a suite. This
folder holds the root-level suites and the shared helpers.

## Code that touches the database

Tests run against a real in-memory SQLite database, `better-sqlite3` with the
checked-in `drizzle/` migrations applied, not a fake. Swap it in at the one
specifier every `db/operations/*.ts` file reaches the database through:

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

Babel hoists `jest.mock` above the imports, so it takes effect before the
module-level `const db = getDrizzleDatabase()` in each operations file runs, and
`expo-sqlite` is never loaded.

- **Foreign keys are on in tests**, stricter than the device, which runs with
  them off. A delete that orphans child rows fails here and passes on a phone.
  Keep them on; fix the delete order.
- **The handle is per test file.** Isolation between tests comes from
  `resetTestDatabase()`, which empties every table and keeps the schema.
- **The Catalogue cache outlives a reset.** Call `invalidateCatalogue()` from
  `db/catalogue.ts` after `resetTestDatabase()` when a test reads the Catalogue.
- **SQLCipher is not exercised.** `better-sqlite3` has none, so the suite proves
  the launch sequence in `db/databaseFile.ts` with a fake device and says
  nothing about encryption (docs/adr/0005 has the device check).
- **The helper mirrors `db/operations/setup.ts`.** Every export added there needs
  a stand-in in `__tests__/helpers/testDatabase.ts`, or code under test gets
  `undefined`.

`useLiveQuery` is not exercised, so live hooks such as
`hooks/usePregnancyMarkedDates.ts` are outside this setup.

## Dates

`jest.globalSetup.js` pins every run to Europe/Berlin, a zone with an offset and
a DST change, so a local day and a UTC day differ the way they do on a phone.
Setting `process.env.TZ` inside a test file does nothing on Linux; to run code in
another zone, see the boundaries runner in `.claude/skills/correctness-review/`.

## Rendering components

When a component's behaviour lives in its effects, render it with
`@testing-library/react-native` against the same in-memory database.
`components/dayView/__tests__/DayView.test.tsx` is the example.

- **Wrap it in `PaperProvider`.** It hosts the `Portal`s this app renders its
  Snackbar and modals into.
- **React Native Testing Library's `render`, `fireEvent` and `act` return
  promises.** Await them; an unawaited `render` leaves `screen` throwing
  "`render` function has not been called".
- **Paper reuses testIDs**: every `IconButton` is `icon-button` and every `Modal`
  is `modal`. Scope queries with `within(screen.getByTestId("modal"))`.
- **jest-expo runs as iOS**, where `BackHandler` does nothing.
  `recordBackPresses` in `helpers/backHandler.ts` replays Android's Back
  dispatch for a modal that needs it
  (`components/settings/__tests__/hardwareBack.test.tsx` uses it);
  `components/__tests__/modalBack.test.ts` checks every modal answers Back, or
  is listed with the reason it does not.
- **A screen under `app/` is tested from the `__tests__/` folder of the
  component it drives**, since expo-router would treat a test file under `app/`
  as a route.
