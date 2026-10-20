/**
 * Every tab bar sets both of its tints from the Paper theme, and both read
 * against the bar in every theme, light and dark.
 *
 * A tab bar without its own inactive tint falls back to React Navigation's
 * theme, which this app never sets and so stays light: in dark mode the
 * inactive icons were rgb(28, 28, 30) at half opacity on a dark bar, 1:1
 * against it. A render test of a layout would mostly exercise mocks of its
 * database wait and the splash screen, so, like `modalBack.test.ts`, this reads
 * the source: which Paper colour each layout passes, then that colour against
 * the theme's background. Android's bar is that background; iOS's is a blur of
 * the screen behind it, which the background only approximates.
 *
 * What it cannot see:
 * - a tab bar outside a `_layout.tsx` under `app/`, or not written as `<Tabs`;
 * - what overrides the two tints from elsewhere: a spread after them, a route
 *   file's own `<Tabs.Screen options>`, a `tabBarLabelStyle` colour, or an icon
 *   or label that ignores the colour it is handed;
 * - `theme.colors` read from React Navigation's `theme`, the argument of an
 *   options function, which it takes for Paper's;
 * - a bar painted other than `colors.background`;
 * - a comment marker inside a string, which it takes for a comment, so it
 *   can skip what follows.
 * A tint set to anything but `theme.colors.<key>` is refused, not missed. It
 * does not compare the active tint with the inactive one: in dark mode they
 * differ in hue, not lightness.
 */
import fs from "node:fs";
import path from "node:path";
import { getTheme } from "@/components/ThemeHandler";
import { themeButtonColors } from "@/constants/Colors";

const ROOT = path.resolve(__dirname, "../..");
/** WCAG AA for text, since the same tint colours each tab's label. */
const MINIMUM_CONTRAST = 4.5;
const COMMENT = /\/\*[\s\S]*?\*\/|\/\/.*$/gm;
/** A tint option and the expression it is set to, up to the next `,` or `}`. */
const TINT = /\b(tabBar(?:Active|Inactive)TintColor)\s*:\s*([^,}]+)/g;
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

/** Every tint the source sets, with the Paper colour key when it is one. */
function tints(source: string) {
  return [...source.replace(COMMENT, "").matchAll(TINT)].map(
    ([, option, value]) => ({
      option,
      value: value.trim(),
      key: PAPER_COLOR.exec(value.trim())?.[1],
    }),
  );
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
  it("reads a tint and skips one in a comment", () => {
    expect(
      tints(`
        tabBarActiveTintColor: theme.colors.primary,
        // tabBarInactiveTintColor: theme.colors.outline,
        tabBarInactiveTintColor: "#1C1C1E",
      `),
    ).toEqual([
      {
        option: "tabBarActiveTintColor",
        value: "theme.colors.primary",
        key: "primary",
      },
      {
        option: "tabBarInactiveTintColor",
        value: '"#1C1C1E"',
        key: undefined,
      },
    ]);
  });

  it("reads a value the formatter wrapped onto a second line", () => {
    const [wrapped] = tints(`
      tabBarInactiveTintColor: theme.colors.onSurfaceVariant
        .concat("80"),
    `);
    expect(wrapped.key).toBeUndefined();
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

    it("sets both tints, each from the Paper theme", () => {
      expect(
        [...new Set(layoutTints.map((tint) => tint.option))].sort(),
      ).toEqual(["tabBarActiveTintColor", "tabBarInactiveTintColor"]);
      expect(layoutTints.filter((tint) => tint.key === undefined)).toEqual([]);
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
