/**
 * Every tab bar sets both of its tints for the whole bar from the Paper theme,
 * and both read against the bar in every theme, light and dark.
 *
 * A tab bar without its own inactive tint falls back to React Navigation's
 * theme, which this app never sets and so stays light: in dark mode the
 * inactive icons were rgb(28, 28, 30) at half opacity on a dark bar, 1:1
 * against it. A render test of a layout would mostly exercise mocks of its
 * database wait and the splash screen, so this reads the source, as
 * `modalBack.test.ts` does, but through the TypeScript parser. Every `<Tabs>`
 * must set both tints in its own `screenOptions={{ }}`, spelled
 * `theme.colors.<key>`; a tint written as an object property anywhere else in
 * the layout, or under a key computed from a variable, fails. Each colour is
 * then measured against the theme's background. Android's bar is that
 * background; iOS's is a blur of the screen behind it, which the background
 * only approximates.
 *
 * What it cannot see:
 * - a tab bar outside a `_layout.tsx` under `app/`, or not written as `<Tabs`;
 * - a route file's own `<Tabs.Screen options>`, which overrides the tints while
 *   that tab is focused;
 * - a tint assigned to an options object after it is built;
 * - a `tabBarLabelStyle` colour, or an icon or label that ignores the colour it
 *   is handed;
 * - a spread inside `screenOptions`, or of props onto `<Tabs>`;
 * - a `theme` that is not the one Paper's `useTheme()` returns;
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

/** The object literal a `<Tabs>` element passes as `screenOptions={{ }}`. */
function screenOptions(
  element: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
): ts.ObjectLiteralExpression | undefined {
  const attribute = element.attributes.properties.find(
    (property) =>
      ts.isJsxAttribute(property) &&
      property.name.getText() === "screenOptions",
  );
  let value =
    attribute &&
    ts.isJsxAttribute(attribute) &&
    attribute.initializer &&
    ts.isJsxExpression(attribute.initializer)
      ? attribute.initializer.expression
      : undefined;
  while (
    value &&
    (ts.isParenthesizedExpression(value) ||
      ts.isAsExpression(value) ||
      ts.isSatisfiesExpression(value))
  ) {
    value = value.expression;
  }
  return value && ts.isObjectLiteralExpression(value) ? value : undefined;
}

/** A property's key, or undefined when it is computed from a variable. */
function keyOf(name: ts.PropertyName): string | undefined {
  if (!ts.isComputedPropertyName(name)) {
    return ts.isIdentifier(name) || ts.isStringLiteral(name)
      ? name.text
      : name.getText();
  }
  return ts.isStringLiteral(name.expression) ||
    ts.isNoSubstitutionTemplateLiteral(name.expression)
    ? name.expression.text
    : undefined;
}

/**
 * How many `<Tabs>` bars the source renders, and every tint it names: the
 * Paper colour key when the value is `theme.colors.<key>`, and the bar whose
 * `screenOptions` holds it. A key computed from a variable counts as a tint,
 * since it could be one.
 */
function scan(source: string) {
  const file = ts.createSourceFile(
    "layout.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const bars: (ts.ObjectLiteralExpression | undefined)[] = [];
  const tints: {
    option: string;
    value: string | undefined;
    key: string | undefined;
    bar: number | undefined;
  }[] = [];
  const findBars = (node: ts.Node) => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText() === "Tabs"
    ) {
      bars.push(screenOptions(node));
    }
    ts.forEachChild(node, findBars);
  };
  const findTints = (node: ts.Node) => {
    if (
      ts.isPropertyAssignment(node) ||
      ts.isShorthandPropertyAssignment(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isGetAccessorDeclaration(node)
    ) {
      const option = keyOf(node.name);
      if (option === undefined || TINT_OPTIONS.includes(option)) {
        const value = ts.isPropertyAssignment(node)
          ? node.initializer.getText().replace(/\s+/g, "")
          : undefined;
        const bar = bars.indexOf(node.parent as ts.ObjectLiteralExpression);
        tints.push({
          option: option ?? node.name.getText(),
          value,
          key:
            option === undefined || value === undefined
              ? undefined
              : PAPER_COLOR.exec(value)?.[1],
          bar: bar === -1 ? undefined : bar,
        });
      }
    }
    ts.forEachChild(node, findTints);
  };
  findBars(file);
  findTints(file);
  return { bars: bars.length, tints };
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
  it("reads every tint, and gives each to the bar whose screenOptions holds it", () => {
    expect(
      scan(`
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
          <Tabs.Screen options={{ [INACTIVE]: "#1C1C1E" }} />
        </Tabs>;
        <Tabs screenOptions={{ ["tabBarActiveTintColor"]: theme.colors.primary }} />;
        <Tabs />;
      `),
    ).toEqual({
      bars: 3,
      tints: [
        {
          option: "tabBarActiveTintColor",
          value: "theme.colors.primary",
          key: "primary",
          bar: 0,
        },
        {
          option: "tabBarInactiveTintColor",
          value: 'theme.colors.onSurfaceVariant.concat("80")',
          key: undefined,
          bar: 0,
        },
        {
          option: "tabBarInactiveTintColor",
          value: "theme.colors.x",
          key: "x",
          bar: undefined,
        },
        {
          option: "tabBarInactiveTintColor",
          value: undefined,
          key: undefined,
          bar: undefined,
        },
        {
          option: "tabBarActiveTintColor",
          value: '"#1C1C1E"',
          key: undefined,
          bar: undefined,
        },
        {
          option: "[INACTIVE]",
          value: '"#1C1C1E"',
          key: undefined,
          bar: undefined,
        },
        {
          option: "tabBarActiveTintColor",
          value: "theme.colors.primary",
          key: "primary",
          bar: 1,
        },
      ],
    });
  });

  it("gives no bar to screenOptions written as a function", () => {
    const { tints } = scan(`
      <Tabs
        screenOptions={({ theme }) => ({
          tabBarActiveTintColor: theme.colors.primary,
        })}
      />;
    `);
    expect(tints.map((tint) => tint.bar)).toEqual([undefined]);
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
    const { bars, tints: layoutTints } = scan(
      fs.readFileSync(path.join(ROOT, layout), "utf8"),
    );
    const eachBar = Array.from({ length: bars }, (_, bar) => bar);

    it("sets both tints on every bar, each from the Paper theme", () => {
      expect(bars).toBeGreaterThan(0);
      expect(
        eachBar.map((bar) =>
          layoutTints
            .filter((tint) => tint.bar === bar)
            .map((tint) => tint.option)
            .sort(),
        ),
      ).toEqual(eachBar.map(() => [...TINT_OPTIONS].sort()));
      expect(
        layoutTints.filter(
          (tint) => tint.bar === undefined || tint.key === undefined,
        ),
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
