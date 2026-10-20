import type {
  ExportAppointment,
  ExportData,
  ExportDayEntry,
  ExportPregnancyDay,
} from "@/constants/Interfaces";

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

/**
 * One header field, quoted only when it has to be.
 *
 * Headers carry Catalogue names, and a custom entry is named by the user, so
 * a comma in one used to split its header in two. RFC 4180 lets a field go
 * bare when nothing in it needs quoting, so every header that never needed it
 * stays exactly as files already written have it.
 */
function csvHeader(name: string): string {
  return /[",\r\n]/.test(name) ? csvField(name) : name;
}

/** An appointment as one phrase: `Title (Type): notes`. */
export function appointmentDetail(appointment: ExportAppointment): string {
  const type = appointment.type ? ` (${appointment.type})` : "";
  const notes = appointment.notes ? `: ${appointment.notes}` : "";
  return `${appointment.title}${type}${notes}`;
}

/**
 * A date's appointments as one cell. The CSV and the PDF both give them one;
 * the JSON keeps each one whole, since a title may itself hold "; ".
 */
export function appointmentsDetail(appointments: ExportAppointment[]): string {
  return appointments.map(appointmentDetail).join("; ");
}

/** A pregnancy day's kicks as a cell: blank when none were stored. */
export function kicksText(day: ExportPregnancyDay | undefined): string {
  return day?.kicks === undefined ? "" : String(day.kicks);
}

/**
 * The dates keyed in any of `records`, once each, oldest first.
 *
 * The plain sort orders `YYYY-MM-DD` by code unit, the same order SQLite's
 * `ORDER BY date` gave `dailyData`, so a file without pregnancy data keeps its
 * order exactly.
 */
function datesOf(...records: Record<string, unknown>[]): string[] {
  return [...new Set(records.flatMap((record) => Object.keys(record)))].sort();
}

/** Every date the export holds anything for, oldest first. */
function exportDates(data: ExportData): string[] {
  return datesOf(
    data.dailyData,
    data.pregnancyDays,
    data.pregnancyAppointments,
  );
}

/**
 * The whole export as JSON: one object per date, keyed by date, oldest first.
 *
 * Each key stands for rows that exist. A date carries the cycle fields when a
 * cycle Day was logged on it, `pregnancy` when a pregnancy day was, and
 * `appointments` when any were. A date with pregnancy data alone has no
 * `flow_intensity`: a 0 there would claim a cycle Day the database does not
 * hold, and an import would create it.
 *
 * The file used to be `JSON.stringify(dailyData, null, 2)`. Without pregnancy
 * data it still is, byte for byte, and with it every cycle entry keeps its
 * shape; the pregnancy keys are additions.
 */
export function toJson(data: ExportData): string {
  const byDate: Record<string, object> = {};

  for (const date of exportDates(data)) {
    // Undefined keys are left out of the file by JSON.stringify.
    byDate[date] = {
      ...(data.dailyData[date] ?? { date }),
      pregnancy: data.pregnancyDays[date],
      appointments: data.pregnancyAppointments[date],
    };
  }

  return JSON.stringify(byDate, null, 2);
}

/** The pregnancy Catalogue names that head the CSV's pregnancy columns. */
type PregnancyHeaders = { symptoms: string[]; moods: string[] };

/** The pregnancy Catalogue names logged, in the order first logged. */
function pregnancyHeadersOf(
  pregnancyDays: ExportData["pregnancyDays"],
): PregnancyHeaders {
  const symptoms = new Set<string>();
  const moods = new Set<string>();

  for (const date of Object.keys(pregnancyDays).sort()) {
    for (const symptom of pregnancyDays[date].symptoms) symptoms.add(symptom);
    for (const mood of pregnancyDays[date].moods) moods.add(mood);
  }

  return { symptoms: [...symptoms], moods: [...moods] };
}

/**
 * The whole export as CSV text: a header row, then one row per date.
 *
 * Pregnancy columns follow the cycle's, and appear only when there is
 * pregnancy data, so a file from a phone without any reads as it always has.
 * A date with nothing logged in one mode leaves that mode's cells blank.
 */
export function toCsv(data: ExportData): string {
  const { headers, dailyData, pregnancyDays, pregnancyAppointments } = data;
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

  const cycleWidth = headerRow.length;
  const hasPregnancyDays = Object.keys(pregnancyDays).length > 0;
  const hasAppointments = Object.keys(pregnancyAppointments).length > 0;
  const pregnancyHeaders = pregnancyHeadersOf(pregnancyDays);

  if (hasPregnancyDays) {
    headerRow.push("pregnancy.kicks");
    for (const symptom of pregnancyHeaders.symptoms) {
      headerRow.push(`pregnancy.symptom.${symptom}`);
    }
    for (const mood of pregnancyHeaders.moods) {
      headerRow.push(`pregnancy.mood.${mood}`);
    }
    headerRow.push("pregnancy.notes");
  }
  const pregnancyWidth = headerRow.length - cycleWidth;
  if (hasAppointments) headerRow.push("appointments");

  const rows: string[] = [headerRow.map(csvHeader).join(",")];
  const blank = (width: number) => Array<string>(width).fill("");

  for (const date of exportDates(data)) {
    const entry = dailyData[date];
    const row = entry
      ? cycleCells(entry, headers)
      : [date, ...blank(cycleWidth - 1)];

    if (hasPregnancyDays) {
      const day = pregnancyDays[date];
      row.push(
        ...(day
          ? pregnancyCells(day, pregnancyHeaders)
          : blank(pregnancyWidth)),
      );
    }
    if (hasAppointments) {
      const appointments = pregnancyAppointments[date];
      row.push(appointments ? csvField(appointmentsDetail(appointments)) : "");
    }

    rows.push(row.join(","));
  }

  return rows.join("\n");
}

function cycleCells(
  entry: ExportDayEntry,
  headers: ExportData["headers"],
): string[] {
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

  return row;
}

function pregnancyCells(
  day: ExportPregnancyDay,
  headers: PregnancyHeaders,
): string[] {
  return [
    kicksText(day),
    ...headers.symptoms.map((symptom) =>
      day.symptoms.includes(symptom) ? "x" : "",
    ),
    ...headers.moods.map((mood) => (day.moods.includes(mood) ? "x" : "")),
    csvField(day.notes),
  ];
}

/** One date of pregnancy mode: its pregnancy day if any, and appointments. */
export type PregnancyExportEntry = {
  date: string;
  day?: ExportPregnancyDay;
  /** Empty when none were booked. */
  appointments: ExportAppointment[];
};

/** Pregnancy days and appointments joined by date, oldest first. */
export function pregnancyEntries({
  pregnancyDays,
  pregnancyAppointments,
}: ExportData): PregnancyExportEntry[] {
  return datesOf(pregnancyDays, pregnancyAppointments).map((date) => ({
    date,
    day: pregnancyDays[date],
    appointments: pregnancyAppointments[date] ?? [],
  }));
}

/** The entries of one calendar month. */
export type MonthGroup<T extends { date: string }> = {
  /** `YYYY-MM`. Sorts correctly as a string and does not depend on a locale. */
  key: string;
  /** Oldest first. */
  entries: T[];
};

/**
 * Entries grouped into calendar months, newest month first.
 *
 * The key is derived from the date rather than from a display label. It used to
 * be `toLocaleString("default", { month: "long", year: "numeric" })`, which the
 * sort then split on a space and looked up in an English-only table of month
 * names. On a French device that label is "août 2026" and on a Spanish one
 * "agosto de 2026", so the lookup returned undefined, `Date.UTC` returned NaN,
 * and the comparator ordered the months arbitrarily. A label is for reading;
 * it is not an identifier, and `monthLabel` makes it from the key.
 */
export function groupEntriesByMonth<T extends { date: string }>(
  entries: T[],
): MonthGroup<T>[] {
  const byMonth = new Map<string, T[]>();

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
      entries: [...monthEntries].sort((a, b) => a.date.localeCompare(b.date)),
    }));
}

/** Whether the PDF's font can draw every character of a label. */
export type CanDraw = (label: string) => boolean;

/**
 * What every label shares: UTC, so a date is the same day in every zone, and
 * Gregorian with Latin digits, so a Persian phone does not label a June row
 * with a Tir date.
 */
const LABEL_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: "UTC",
  calendar: "gregory",
  numberingSystem: "latn",
};

/**
 * An instant as the phone's locale writes it, or in English when the PDF's
 * font cannot draw that.
 *
 * The standard PDF fonts draw WinAnsi only. Russian or Arabic month names and
 * Japanese day marks are none of it, so on those phones every PDF failed, and
 * replacing what the font cannot draw would leave no readable date. These
 * labels are the app's own, unlike a note, so they can be written another way.
 */
function readableLabel(
  instant: Date,
  options: Intl.DateTimeFormatOptions,
  canDraw: CanDraw,
): string {
  const formatOptions = { ...options, ...LABEL_OPTIONS };
  const label = instant.toLocaleString(undefined, formatOptions);
  return canDraw(label) ? label : instant.toLocaleString("en", formatOptions);
}

const MONTH_LABEL_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "long",
  year: "numeric",
};

/** A month group's key as a PDF heading, such as "August 2026". */
export function monthLabel(key: string, canDraw: CanDraw): string {
  return readableLabel(
    new Date(`${key}-01T00:00:00Z`),
    MONTH_LABEL_OPTIONS,
    canDraw,
  );
}

const DAY_LABEL_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "2-digit",
};

/**
 * A date as a PDF row labels it, such as "01 Sat".
 *
 * `new Date("2026-08-01")` is midnight UTC, and the label used to be formatted
 * in the phone's zone. Anywhere west of Greenwich that instant is still 31
 * July, so every row printed in the Americas carried the day before its own.
 * Read and formatted in UTC, like the month label above, a date is the same
 * day everywhere.
 */
export function dayLabel(date: string, canDraw: CanDraw): string {
  return readableLabel(
    new Date(`${date}T00:00:00Z`),
    DAY_LABEL_OPTIONS,
    canDraw,
  );
}
