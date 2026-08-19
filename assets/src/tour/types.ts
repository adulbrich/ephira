import type { Href } from "expo-router";

export type TourStep = {
  id: string;
  title: string;
  text: string;
  /**
   * Checked against the routes expo-router generates, not a free string.
   * `.expo/types/router.d.ts` is gitignored, so CI typechecks with a
   * permissive `Href` and cannot catch a typo here — a local `expo start`
   * regenerates it and can.
   */
  route: Href;
};
