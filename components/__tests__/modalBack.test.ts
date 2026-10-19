/**
 * Every modal answers hardware Back.
 *
 * A Paper `Modal` hands Back to its `onDismiss`; with none, or with a no-op,
 * it swallows Back and strands the user on Android, which is what #275, #277
 * and #278 fixed. A React Native `Modal` needs `onRequestClose` for the same
 * reason. jest-expo runs as iOS, where `BackHandler` does nothing, so a render
 * test cannot see this; like `db/__tests__/expoSqliteImport.test.ts`, this
 * reads the source instead. `components/settings/__tests__/hardwareBack.test.tsx`
 * shows how to drive Back itself when a modal's behaviour needs testing.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const SCANNED = ["app", "components", "assets/src"];

/**
 * Known to swallow Back today, each waiting on a decision about what Back
 * should do there. The last test fails once an entry is fixed, so the list
 * cannot outlive the defect.
 *
 * - The onboarding tour's spotlight: Back could skip the tour, as its Skip
 *   button does, or step back one stop.
 */
const KNOWN = new Map([
  [
    "assets/src/tour/SpotlightOverlay.tsx",
    "a React Native Modal with no onRequestClose",
  ],
]);
const NO_OP = /onDismiss=\{\s*\(\)\s*=>\s*(?:\{\s*\}|undefined|null)\s*\}/;
const PAPER_MODAL_IMPORT =
  /import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*["']react-native-paper["']/;

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "__tests__") return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.name.endsWith(".tsx") ? [full] : [];
  });
}

/**
 * The opening `<Modal ...>` tags in `source`. Braces are tracked so an arrow
 * function's `=>` inside an attribute does not end the tag.
 */
function modalTags(source: string): string[] {
  const tags: string[] = [];
  let from = source.indexOf("<Modal");
  while (from !== -1) {
    let depth = 0;
    let quote = "";
    let end = from;
    for (; end < source.length; end++) {
      const char = source[end];
      if (quote) {
        if (char === quote) quote = "";
      } else if (char === '"' || char === "'") {
        if (depth === 0) quote = char;
      } else if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
      } else if (char === ">" && depth === 0) {
        break;
      }
    }
    tags.push(source.slice(from, end + 1));
    from = source.indexOf("<Modal", end);
  }
  return tags;
}

/** Why `tag` swallows Back, or null when it answers it. */
function backProblem(tag: string, isPaper: boolean): string | null {
  if (isPaper) {
    if (!/\bonDismiss=\{/.test(tag)) return "a Paper Modal with no onDismiss";
    if (NO_OP.test(tag)) return "a Paper Modal whose onDismiss does nothing";
    return null;
  }
  return /\bonRequestClose=\{/.test(tag)
    ? null
    : "a React Native Modal with no onRequestClose";
}

describe("modalTags and backProblem", () => {
  it("reads a tag whose attributes hold arrow functions", () => {
    const [tag] = modalTags(
      "<Modal visible={open} onDismiss={() => setOpen(false)}>\n<Text />",
    );
    expect(tag).toBe("<Modal visible={open} onDismiss={() => setOpen(false)}>");
    expect(backProblem(tag, true)).toBeNull();
  });

  it("flags a Paper Modal that swallows Back", () => {
    expect(backProblem("<Modal visible onDismiss={() => {}}>", true)).toBe(
      "a Paper Modal whose onDismiss does nothing",
    );
    expect(backProblem("<Modal visible>", true)).toBe(
      "a Paper Modal with no onDismiss",
    );
  });

  it("flags a React Native Modal with no onRequestClose", () => {
    expect(backProblem('<Modal visible animationType="fade">', false)).toBe(
      "a React Native Modal with no onRequestClose",
    );
  });
});

function problemsInApp(): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of SCANNED.flatMap((dir) =>
    sourceFiles(path.join(ROOT, dir)),
  )) {
    const source = fs.readFileSync(file, "utf8");
    const isPaper = PAPER_MODAL_IMPORT.test(source);
    for (const tag of modalTags(source)) {
      const problem = backProblem(tag, isPaper);
      if (problem) found.set(path.relative(ROOT, file), problem);
    }
  }
  return found;
}

it("every modal in the app answers hardware Back", () => {
  const unexpected = [...problemsInApp()].filter(
    ([file, problem]) => KNOWN.get(file) !== problem,
  );
  expect(unexpected).toEqual([]);
});

it("every known exception still needs its fix", () => {
  const found = problemsInApp();
  const fixed = [...KNOWN].filter(
    ([file, problem]) => found.get(file) !== problem,
  );
  expect(fixed).toEqual([]);
});
