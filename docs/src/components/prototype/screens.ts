// @ts-nocheck: the app's root tsconfig checks every .ts file in the repo, this
// one included, and it has neither Astro's types nor its image imports.
// PROTOTYPE: the screenshots the three landing page variants share. Every one
// is a frame cut from the May 2025 Android screen recordings, status and
// navigation bars cropped off, so each is marked stale until it is recaptured.
import type { ImageMetadata } from "astro";
import calMonth from "../../assets/screens/cal-month.webp";
import calVertigo from "../../assets/screens/cal-vertigo.webp";
import customEntry from "../../assets/screens/custom-entry.webp";
import filterDialog from "../../assets/screens/filter-dialog.webp";
import lock from "../../assets/screens/lock.webp";
import logChips from "../../assets/screens/log-chips.webp";
import settings from "../../assets/screens/settings.webp";
import visibility from "../../assets/screens/visibility.webp";
import theme0 from "../../assets/screens/theme-0.webp";
import theme1 from "../../assets/screens/theme-1.webp";
import theme2 from "../../assets/screens/theme-2.webp";
import theme3 from "../../assets/screens/theme-3.webp";
import theme4 from "../../assets/screens/theme-4.webp";
import theme5 from "../../assets/screens/theme-5.webp";
import theme6 from "../../assets/screens/theme-6.webp";
import theme7 from "../../assets/screens/theme-7.webp";
import theme8 from "../../assets/screens/theme-8.webp";
import theme9 from "../../assets/screens/theme-9.webp";
import theme10 from "../../assets/screens/theme-10.webp";
import theme11 from "../../assets/screens/theme-11.webp";

export interface ShotData {
  src: ImageMetadata;
  alt: string;
  stale: boolean;
}

const stale = (src: ImageMetadata, alt: string): ShotData => ({
  src,
  alt,
  stale: true,
});

export const shots = {
  calMonth: stale(
    calMonth,
    "The month calendar, with flow, migraine and cramps marked under the days they were logged",
  ),
  calVertigo: stale(
    calVertigo,
    "The month calendar with a custom symptom, Vertigo, in its legend",
  ),
  logChips: stale(
    logChips,
    "Logging a day: the symptom list open, with migraine picked from chips such as cramps, headache and nausea",
  ),
  filterDialog: stale(
    filterDialog,
    "The Filter Calendar dialog, with flow, headache and migraine as the active filters",
  ),
  customEntry: stale(
    customEntry,
    "Adding a custom symptom called Vertigo on the Custom Entries screen",
  ),
  visibility: stale(
    visibility,
    "Calendar Entries Visibility, with a switch for each symptom",
  ),
  settings: stale(
    settings,
    "Settings: app lock, customization, theme colour, delete data and privacy policy",
  ),
  lock: stale(lock, "The lock screen asking for the ephira password"),
};

// The order the recording cycles through constants/themes.
const colours = ["purple", "pink", "yellow", "green", "blue", "brown"];
export const themes = [
  theme0,
  theme1,
  theme2,
  theme3,
  theme4,
  theme5,
  theme6,
  theme7,
  theme8,
  theme9,
  theme10,
  theme11,
].map((src, i) =>
  stale(
    src,
    `The calendar in the ${colours[i % 6]} theme, ${i < 6 ? "light" : "dark"} mode`,
  ),
);
