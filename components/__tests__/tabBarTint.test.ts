/**
 * Every tab bar names both of its tints, and both read in every theme, light
 * and dark.
 *
 * A tab bar without its own inactive tint falls back to React Navigation's
 * theme, which this app never sets, so it stays light: in dark mode the
 * inactive icons were rgb(28, 28, 30) at half opacity on a dark bar, 1:1
 * against it. A render test of a layout would mostly exercise mocks of its
 * database wait and the splash screen, so, like `modalBack.test.ts`, this reads
 * the source: which Paper colour each layout passes, then that colour against
 * the theme's background.
 *
 * The background stands in for the iOS bar, a blur that follows the same
 * system appearance the Paper theme does; Android's bar is the background.
 */
import fs from "node:fs";
import path from "node:path";
import { getTheme } from "@/components/ThemeHandler";
import { themeButtonColors } from "@/constants/Colors";

const ROOT = path.resolve(__dirname, "../..");
/** WCAG AA for text, since the same tint colours each tab's label. */
const MINIMUM_CONTRAST = 4.5;
const TINT = /(tabBar(?:Active|Inactive)TintColor):\s*theme\.colors\.(\w+)/g;

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

/** `#RRGGBB` or an opaque `rgb()`/`rgba()`, as Paper and the themes write them. */
function channels(color: string): number[] {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16));
  }
  const rgb = /^rgba?\(([^)]*)\)$/.exec(color);
  const parts = rgb?.[1].split(",").map(Number);
  if (!parts || parts.length < 3 || (parts.length === 4 && parts[3] !== 1)) {
    throw new Error(`cannot measure ${color}: not an opaque colour`);
  }
  return parts.slice(0, 3);
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
    const tints = Object.fromEntries(
      [...fs.readFileSync(path.join(ROOT, layout), "utf8").matchAll(TINT)].map(
        ([, option, color]) => [option, color],
      ),
    );

    it("sets both tints from the Paper theme", () => {
      expect(Object.keys(tints).sort()).toEqual([
        "tabBarActiveTintColor",
        "tabBarInactiveTintColor",
      ]);
    });

    it.each(cases)("reads in $name, $mode", ({ name, mode }) => {
      const { colors } = getTheme(name, mode === "dark");
      const unreadable = Object.entries(tints)
        .map(([option, key]) => {
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
        .filter((tint) => tint.contrast < MINIMUM_CONTRAST);

      expect(unreadable).toEqual([]);
    });
  });
});
