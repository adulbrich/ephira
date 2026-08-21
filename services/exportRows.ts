import type { ExportData, ExportDayEntry } from "@/constants/Interfaces";

/**
 * What one Day looks like in an export, above the format it is written in.
 *
 * The CSV and the PDF each composed a birth control cell their own way, and
 * each had its own idea of how to order months, with neither reachable by a
 * test: `formatJsonDataToCsv` was unexported in a file that imports
 * `expo-sharing`, and the PDF's grouping ran inside the same function that
 * writes the file and hands it to the share sheet.
 */

/** The name of a Medication, with whatever detail was recorded against it. */
type LoggedMedication = {
  name: string;
  time_taken?: string;
  notes?: string;
};

/**
 * The time and notes recorded against a birth control Entry, as one phrase.
 *
 * This was written twice, with different labels and different separators:
 * `Time Taken: {t} Notes: {n}` in the CSV and `Time: {t}, Notes: {n}` in the
 * PDF. It is one fact about one Entry, so it reads the same in both now.
 */
export function birthControlDetail(medication: LoggedMedication): string {
  const parts: string[] = [];
  if (medication.time_taken) parts.push(`Time: ${medication.time_taken}`);
  if (medication.notes) parts.push(`Notes: ${medication.notes}`);
  return parts.join(", ");
}

/**
 * One CSV field, quoted and escaped.
 *
 * Values were wrapped as `"${value}"` and never escaped. A note containing a
 * quote ended its field early, so the row gained columns and everything after
 * it shifted. Doubling the quote is what RFC 4180 asks for and what every
 * spreadsheet expects.
 */
export function csvField(value: string | undefined | null): string {
  return `"${(value ?? "").replace(/"/g, '""')}"`;
}

/** The whole export as CSV text: a header row, then one row per Day. */
export function toCsv({ headers, dailyData }: ExportData): string {
  const headerRow = [...headers.base_header];

  for (const symptom of headers.symptoms) headerRow.push(`symptom.${symptom}`);
  for (const mood of headers.moods) headerRow.push(`mood.${mood}`);
  for (const medication of headers.medications) {
    headerRow.push(`medication.${medication}`);
  }
  for (const birthControl of headers.birth_control) {
    headerRow.push(`birth_control.${birthControl}`);
    headerRow.push(`birth_control.${birthControl}.notes`);
  }

  const rows: string[] = [headerRow.join(",")];

  for (const entry of Object.values(dailyData)) {
    const row: string[] = [
      entry.date,
      String(entry.flow_intensity),
      csvField(entry.notes),
    ];

    for (const symptom of headers.symptoms) {
      row.push(entry.symptoms.includes(symptom) ? "x" : "");
    }
    for (const mood of headers.moods) {
      row.push(entry.moods.includes(mood) ? "x" : "");
    }
    for (const medication of headers.medications) {
      row.push(entry.medications.some((m) => m.name === medication) ? "x" : "");
    }
    for (const birthControl of headers.birth_control) {
      const logged = entry.birth_control.find((bc) => bc.name === birthControl);
      if (logged) {
        row.push("x", csvField(birthControlDetail(logged)));
      } else {
        row.push("", "");
      }
    }

    rows.push(row.join(","));
  }

  return rows.join("\n");
}

/** The Days of one calendar month, with a label to print above them. */
export type MonthGroup = {
  /** `YYYY-MM`. Sorts correctly as a string and does not depend on a locale. */
  key: string;
  /** For display only. Never parsed back. */
  label: string;
  /** Oldest first. */
  entries: ExportDayEntry[];
};

const MONTH_LABEL_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
};

/**
 * The Days grouped into calendar months, newest month first.
 *
 * The key is derived from the date rather than from a display label. It used to
 * be `toLocaleString("default", { month: "long", year: "numeric" })`, which the
 * sort then split on a space and looked up in an English-only table of month
 * names. On a French device that label is "août 2026" and on a Spanish one
 * "agosto de 2026", so the lookup returned undefined, `Date.UTC` returned NaN,
 * and the comparator ordered the months arbitrarily. A label is for reading;
 * it is not an identifier.
 */
export function groupEntriesByMonth(entries: ExportDayEntry[]): MonthGroup[] {
  const byMonth = new Map<string, ExportDayEntry[]>();

  for (const entry of entries) {
    const key = entry.date.slice(0, 7);
    const group = byMonth.get(key);
    if (group) group.push(entry);
    else byMonth.set(key, [entry]);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, monthEntries]) => ({
      key,
      label: new Date(`${key}-01T00:00:00Z`).toLocaleString(
        undefined,
        MONTH_LABEL_OPTIONS,
      ),
      entries: [...monthEntries].sort((a, b) => a.date.localeCompare(b.date)),
    }));
}
