/**
 * Every tab bar sets both of its tints for the whole bar from the Paper theme,
 * and both read against the bar in every theme, light and dark.
 *
 * A tab bar without its own inactive tint falls back to React Navigation's
 * theme, which this app never sets and so stays light: in dark mode the
 * inactive icons were rgb(28, 28, 30) at half opacity on a dark bar, 1:1
 * against it. A render test of a layout would mostly exercise mocks of its
 * database wait and the splash screen, so, like `modalBack.test.ts`, this reads
 * the source, parsed as TypeScript. Both tints must be properties of
 * `<Tabs screenOptions={{ }}>` spelled `theme.colors.<key>`; a tint named
 * anywhere else in the layout fails. Each colour is then measured against the
 * theme's background. Android's bar is that background; iOS's is a blur of the
 * screen behind it, which the background only approximates.
 *
 * What it cannot see:
 * - a tab bar outside a `_layout.tsx` under `app/`, or not written as `<Tabs`;
 * - a route file's own `<Tabs.Screen options>`, which overrides the tints while
 *   that tab is focused;
 * - a `tabBarLabelStyle` colour, or an icon or label that ignores the colour it
 *   is handed;
 * - a spread inside `screenOptions`;
 * - a bar painted other than `colors.background`.
 *
 * It does not compare the active tint with the inactive one: in dark mode they
 * differ in hue, not lightness.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { getTheme } from "@/components/ThemeHandler";
import { themeButtonColors } from "@/constants/Colors";

const ROOT = path.resolve(__dirname, "../..");
/** WCAG AA for text, since the same tint colours each tab's label. */
const MINIMUM_CONTRAST = 4.5;
const TINT_OPTIONS = ["tabBarActiveTintColor", "tabBarInactiveTintColor"];
const PAPER_COLOR = /^theme\.colors\.(\w+)$/;

function tabLayouts(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return tabLayouts(file);
    return entry.name === "_layout.tsx" &&
      fs.readFileSync(file, "utf8").includes("<Tabs")
      ? [path.relative(ROOT, file)]
      : [];
  });
}

/** The object literal in a `<Tabs screenOptions={{ }}>` attribute. */
function barOptions(node: ts.Node): ts.ObjectLiteralExpression | undefined {
  if (!ts.isJsxAttribute(node) || node.name.getText() !== "screenOptions") {
    return undefined;
  }
  const element = node.parent.parent;
  const onTabs =
    (ts.isJsxOpeningElement(element) || ts.isJsxSelfClosingElement(element)) &&
    element.tagName.getText() === "Tabs";
  let value =
    node.initializer && ts.isJsxExpression(node.initializer)
      ? node.initializer.expression
      : undefined;
  while (
    value &&
    (ts.isParenthesizedExpression(value) ||
      ts.isAsExpression(value) ||
      ts.isSatisfiesExpression(value))
  ) {
    value = value.expression;
  }
  return onTabs && value && ts.isObjectLiteralExpression(value)
    ? value
    : undefined;
}

/**
 * Every tint the source names, wherever it is: the Paper colour key when the
 * value is `theme.colors.<key>`, and whether it is set for the whole bar.
 */
function tints(source: string) {
  const file = ts.createSourceFile(
    "layout.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const bars = new Set<ts.Node>();
  const found: {
    option: string;
    value: string | undefined;
    key: string | undefined;
    wholeBar: boolean;
  }[] = [];
  const findBars = (node: ts.Node) => {
    const options = barOptions(node);
    if (options) bars.add(options);
    ts.forEachChild(node, findBars);
  };
  const findTints = (node: ts.Node) => {
    if (
      (ts.isPropertyAssignment(node) ||
        ts.isShorthandPropertyAssignment(node)) &&
      (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
      TINT_OPTIONS.includes(node.name.text)
    ) {
      const value = ts.isPropertyAssignment(node)
        ? node.initializer.getText(file).replace(/\s+/g, "")
        : undefined;
      found.push({
        option: node.name.text,
        value,
        key: value === undefined ? undefined : PAPER_COLOR.exec(value)?.[1],
        wholeBar: bars.has(node.parent),
      });
    }
    ts.forEachChild(node, findTints);
  };
  findBars(file);
  findTints(file);
  return found;
}

/** `#RRGGBB` or an opaque `rgb()`/`rgba()`, as Paper and the themes write them. */
function channels(color: string): number[] {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16));
  const parts = /^rgba?\(([^)]*)\)$/
    .exec(color)?.[1]
    .split(",")
    .map((part) => part.trim());
  const rgb = parts
    ?.slice(0, 3)
    .map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : Number.NaN));
  const opaque =
    parts?.length === 3 || (parts?.length === 4 && Number(parts[3]) === 1);
  if (!rgb || !opaque || rgb.some((value) => !(value <= 255))) {
    throw new Error(`cannot measure ${color}: not an opaque colour`);
  }
  return rgb;
}

function luminance(color: string): number {
  const [r, g, b] = channels(color).map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const layouts = tabLayouts(path.join(ROOT, "app"));
const cases = (
  Object.keys(themeButtonColors) as Parameters<typeof getTheme>[0][]
).flatMap((name) =>
  (["light", "dark"] as const).map((mode) => ({ name, mode })),
);

describe("the measure", () => {
  it("reads every tint, and only those in screenOptions cover the bar", () => {
    expect(
      tints(`
        const tabBarInactiveTintColor = "#1C1C1E";
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: theme.colors.primary,
            // tabBarInactiveTintColor: theme.colors.outline,
            tabBarAccessibilityLabel: "Files/*",
            tabBarInactiveTintColor: theme.colors.onSurfaceVariant
              .concat("80"),
          }}
        >
          <Tabs.Screen options={{ tabBarInactiveTintColor: theme.colors.x }} />
          <Tabs.Screen options={{ tabBarInactiveTintColor }} />
          <Tabs.Screen options={{ "tabBarActiveTintColor": "#1C1C1E" }} />
        </Tabs>;
      `),
    ).toEqual([
      {
        option: "tabBarActiveTintColor",
        value: "theme.colors.primary",
        key: "primary",
        wholeBar: true,
      },
      {
        option: "tabBarInactiveTintColor",
        value: 'theme.colors.onSurfaceVariant.concat("80")',
        key: undefined,
        wholeBar: true,
      },
      {
        option: "tabBarInactiveTintColor",
        value: "theme.colors.x",
        key: "x",
        wholeBar: false,
      },
      {
        option: "tabBarInactiveTintColor",
        value: undefined,
        key: undefined,
        wholeBar: false,
      },
      {
        option: "tabBarActiveTintColor",
        value: '"#1C1C1E"',
        key: undefined,
        wholeBar: false,
      },
    ]);
  });

  it("does not count screenOptions written as a function", () => {
    const [tint] = tints(`
      <Tabs
        screenOptions={({ theme }) => ({
          tabBarActiveTintColor: theme.colors.primary,
        })}
      />;
    `);
    expect(tint.wholeBar).toBe(false);
  });

  it("puts black on white at 21:1 and refuses what it cannot measure", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21);
    expect(contrast("#777777", "#FFFFFF")).toBeLessThan(MINIMUM_CONTRAST);
    for (const color of [
      "rgba(28, 28, 30, 0.5)",
      "rgb(11%, 11%, 12%)",
      "rgb(, , )",
      "#fff",
    ]) {
      expect(() => channels(color)).toThrow("not an opaque colour");
    }
  });
});

describe("tab bar tints", () => {
  it("finds the tab layouts", () => {
    expect(layouts).toEqual(
      expect.arrayContaining([
        "app/(tabs)/_layout.tsx",
        "app/(pregnancy-tabs)/_layout.tsx",
      ]),
    );
  });

  describe.each(layouts)("%s", (layout) => {
    const layoutTints = tints(fs.readFileSync(path.join(ROOT, layout), "utf8"));

    it("sets both tints for the whole bar, each from the Paper theme", () => {
      expect(
        layoutTints
          .filter((tint) => tint.wholeBar)
          .map((tint) => tint.option)
          .sort(),
      ).toEqual(TINT_OPTIONS);
      expect(
        layoutTints.filter((tint) => !tint.wholeBar || tint.key === undefined),
      ).toEqual([]);
    });

    it.each(cases)("reads in $name, $mode", ({ name, mode }) => {
      const { colors } = getTheme(name, mode === "dark");
      const unreadable = layoutTints
        .map(({ option, key }) => {
          const color = colors[key as keyof typeof colors];
          if (typeof color !== "string") {
            throw new Error(`${option}: theme.colors.${key} is not a colour`);
          }
          return {
            option,
            color,
            contrast: contrast(color, colors.background),
          };
        })
        .filter((tint) => !(tint.contrast >= MINIMUM_CONTRAST));

      expect(unreadable).toEqual([]);
    });
  });
});
