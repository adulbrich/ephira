/**
 * Every modal answers hardware Back, or is listed with the reason it does not.
 *
 * A Paper `Modal`, and a Paper `Dialog`, which renders one, hands Back to its
 * `onDismiss`; with none, a no-op, or `dismissable={false}`, it swallows Back
 * and strands the user on Android, which is what #275, #277 and #278 fixed.
 * A React Native `Modal` needs a real `onRequestClose` for the same reason.
 * jest-expo runs as iOS, where `BackHandler` does nothing, so a render test
 * cannot see this; like `db/__tests__/expoSqliteImport.test.ts`, this reads
 * the source instead. `components/settings/__tests__/hardwareBack.test.tsx`
 * shows how to drive Back itself when a modal's behaviour needs testing.
 *
 * What it cannot see: a component imported under another name, a
 * `dismissable` that is not a literal (the pregnancy setup dialog's depends
 * on whether a start date exists), and a handler passed through a
 * `{...props}` spread, which it trusts.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const SCANNED = ["app", "components", "assets/src"];
/** A handler's value, inside its braces, that does nothing. */
const NO_OP =
  /^\s*(?:undefined|\(\)\s*=>\s*(?:\{\s*(?:\/\*[\s\S]*?\*\/|\/\/[^\n]*\n)?\s*\}|undefined|null|void 0))\s*$/;
const PAPER_IMPORT =
  /import\s*\{([^}]*)\}\s*from\s*["']react-native-paper["']/g;
/** A spread of attributes onto the element, not a spread inside a value. */
const ATTRIBUTE_SPREAD = /\s\{\s*\.\.\./;

/**
 * Swallowing Back on purpose. Each entry is a file and the problem the
 * scanner reports there, once per occurrence.
 */
const BY_DESIGN = [
  // The lock screen's password prompt: Back must not dismiss a lock.
  "components/PasswordAuthenticationView.tsx: a Paper modal with dismissable={false}",
  // The lock screen's data-deletion notice: while data is deleted, and after,
  // there is nothing to go back to; it asks for a restart, or offers to try
  // again.
  "components/PasswordAuthenticationView.tsx: a Paper modal with dismissable={false}",
];

/**
 * Swallowing Back today, each waiting on a decision about what Back should do
 * there. The last test fails once one is fixed, so the list cannot outlive
 * the defect.
 *
 * - The authentication choice dialogs: Back could cancel, as their Cancel
 *   buttons do.
 * - The lock screen's reset-password confirmation: Back could do what its
 *   Cancel does and return to the lock, which unlocks nothing.
 * - The onboarding tour's spotlight: Back could skip the tour, as its Skip
 *   button does, or step back one stop.
 */
const KNOWN = [
  "components/PasswordAuthenticationView.tsx: a Paper modal with dismissable={false}",
  "components/settings/AuthenticationSettings.tsx: a Paper modal with no onDismiss",
  "components/settings/AuthenticationSettings.tsx: a Paper modal with no onDismiss",
  "components/settings/AuthenticationSettings.tsx: a Paper modal with no onDismiss",
  "assets/src/tour/SpotlightOverlay.tsx: a React Native Modal with no onRequestClose",
];

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "__tests__") return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.name.endsWith(".tsx") ? [full] : [];
  });
}

/**
 * The opening tags of element `name` in `source`: `<Modal ...>` but not
 * `<ModalWrapper>` or `<Dialog.Title>`. Quotes are tracked at every depth,
 * comments inside braces are skipped and braces are counted, so `=>`, `"}"`
 * or an apostrophe in a comment does not end the tag.
 */
function openingTags(source: string, name: string): string[] {
  const tags: string[] = [];
  const start = new RegExp(`<${name}(?=[\\s/>])`, "g");
  for (const match of source.matchAll(start)) {
    let depth = 0;
    let quote = "";
    let end = match.index;
    for (; end < source.length; end++) {
      const char = source[end];
      if (quote) {
        if (char === "\\") end++;
        else if (char === quote) quote = "";
      } else if (depth > 0 && source.startsWith("/*", end)) {
        const close = source.indexOf("*/", end + 2);
        end = close === -1 ? source.length : close + 1;
      } else if (depth > 0 && source.startsWith("//", end)) {
        const newline = source.indexOf("\n", end);
        end = newline === -1 ? source.length : newline;
      } else if (char === '"' || char === "'" || char === "`") {
        quote = char;
      } else if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
      } else if (char === ">" && depth === 0) {
        break;
      }
    }
    tags.push(source.slice(match.index, end + 1));
  }
  return tags;
}

/** The text inside `name={...}` in `tag`, braces matched, or null. */
function attributeValue(tag: string, name: string): string | null {
  const start = new RegExp(`\\b${name}=\\{`).exec(tag);
  if (!start) return null;
  const from = start.index + start[0].length;
  let depth = 1;
  let at = from;
  for (; at < tag.length && depth > 0; at++) {
    if (tag[at] === "{") depth++;
    else if (tag[at] === "}") depth--;
  }
  return tag.slice(from, at - 1);
}

/** Why `tag` swallows Back, or null when it answers it. */
function backProblem(tag: string, paper: boolean): string | null {
  const handlerName = paper ? "onDismiss" : "onRequestClose";
  const kind = paper ? "a Paper modal" : "a React Native Modal";
  if (paper && /\bdismissable=\{\s*false\s*\}/.test(tag)) {
    // Paper's Modal lets Back through even then with dismissableBackButton.
    return /\bdismissableBackButton\b/.test(tag)
      ? null
      : "a Paper modal with dismissable={false}";
  }
  const handler = attributeValue(tag, handlerName);
  if (handler === null) {
    return ATTRIBUTE_SPREAD.test(tag) ? null : `${kind} with no ${handlerName}`;
  }
  return NO_OP.test(handler)
    ? `${kind} whose ${handlerName} does nothing`
    : null;
}

function problemsIn(source: string): string[] {
  const paperNames = [...source.matchAll(PAPER_IMPORT)]
    .map((match) => match[1])
    .join(",");
  const paperModal = /\bModal\b/.test(paperNames);
  const paperDialog = /\bDialog\b/.test(paperNames);
  const found: string[] = [];
  for (const tag of openingTags(source, "Modal")) {
    const problem = backProblem(tag, paperModal);
    if (problem) found.push(problem);
  }
  if (paperDialog) {
    for (const tag of openingTags(source, "Dialog")) {
      const problem = backProblem(tag, true);
      if (problem) found.push(problem);
    }
  }
  return found;
}

function problemsInApp(): string[] {
  return SCANNED.flatMap((dir) => sourceFiles(path.join(ROOT, dir)))
    .flatMap((file) =>
      problemsIn(fs.readFileSync(file, "utf8")).map(
        (problem) => `${path.relative(ROOT, file)}: ${problem}`,
      ),
    )
    .sort();
}

describe("the scanner", () => {
  const paper = 'import { Dialog, Modal } from "react-native-paper";\n';
  const native = 'import { Modal } from "react-native";\n';

  it("passes a Paper modal whose onDismiss does something", () => {
    expect(
      problemsIn(`${paper}<Modal visible onDismiss={() => setOpen(false)}>`),
    ).toEqual([]);
  });

  it("flags each way a Paper modal swallows Back", () => {
    expect(
      problemsIn(
        `${paper}<Modal visible><Dialog visible onDismiss={() => {}}><Dialog visible dismissable={false} onDismiss={close}><Dialog.Title>`,
      ),
    ).toEqual([
      "a Paper modal with no onDismiss",
      "a Paper modal whose onDismiss does nothing",
      "a Paper modal with dismissable={false}",
    ]);
  });

  it("flags a React Native Modal with no handler or a no-op", () => {
    expect(
      problemsIn(
        `${native}<Modal transparent><Modal onRequestClose={() => undefined}>`,
      ),
    ).toEqual([
      "a React Native Modal with no onRequestClose",
      "a React Native Modal whose onRequestClose does nothing",
    ]);
  });

  it("reads past braces and quotes inside attributes", () => {
    expect(
      problemsIn(
        `${native}<Modal label={"}"} style={{ a: 1 }}>\n<View onRequestClose={x} />`,
      ),
    ).toEqual(["a React Native Modal with no onRequestClose"]);
  });

  it("ignores components whose names start with Modal", () => {
    expect(problemsIn(`${native}<ModalWrapper visible>`)).toEqual([]);
  });

  it("trusts an attribute spread, not a spread inside a value", () => {
    expect(problemsIn(`${paper}<Dialog visible {...props}>`)).toEqual([]);
    expect(problemsIn(`${paper}<Dialog visible style={{ ...base }}>`)).toEqual([
      "a Paper modal with no onDismiss",
    ]);
  });

  it("judges only the handler's own value", () => {
    expect(
      problemsIn(
        `${native}<Modal onRequestClose={() => close() /* don't */} onShow={() => {}}>`,
      ),
    ).toEqual([]);
  });

  it("reads every Paper import and honours dismissableBackButton", () => {
    const twoImports =
      'import { Text } from "react-native-paper";\nimport { Dialog } from "react-native-paper";\n';
    expect(problemsIn(`${twoImports}<Dialog visible>`)).toEqual([
      "a Paper modal with no onDismiss",
    ]);
    expect(
      problemsIn(`${paper}<Dialog dismissable={false} dismissableBackButton>`),
    ).toEqual([]);
  });
});

it("every modal in the app answers Back, or is listed", () => {
  const listed = [...BY_DESIGN, ...KNOWN];
  const unlisted = problemsInApp().filter((problem) => {
    const at = listed.indexOf(problem);
    if (at === -1) return true;
    listed.splice(at, 1);
    return false;
  });
  expect(unlisted).toEqual([]);
});

it("every listed exception is still there", () => {
  expect(problemsInApp()).toEqual([...BY_DESIGN, ...KNOWN].sort());
});
