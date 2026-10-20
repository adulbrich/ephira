import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import type { ExportData, ExportDayEntry } from "../../constants/Interfaces";
import {
  appointmentsDetail,
  birthControlDetail,
  dayLabel,
  groupEntriesByMonth,
  kicksText,
  monthLabel,
  pregnancyEntries,
  type PregnancyExportEntry,
} from "@/services/exportRows";

const fontSize = 10;
const verticalPadding = 2;
const lineHeight = 16;
const lineSpacing = 2;
const margin = 20;
const columnWidths = [50, 50, 110, 110, 120, 120];
const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
const flowMap = ["", "Spotting", "Light", "Medium", "Heavy"];
const lightGray = rgb(0.95, 0.95, 0.95);

/** Whether the font can draw one character. */
function encodes(char: string, encodable: Set<number>): boolean {
  return encodable.has(char.codePointAt(0) ?? 0);
}

/**
 * `text` with each character the font cannot encode replaced: whitespace by a
 * space, anything else by "?".
 *
 * The standard fonts draw WinAnsi only, and pdf-lib throws on anything else, so
 * one emoji in a note used to fail the whole export. The PDF is a copy to read;
 * the JSON and CSV keep the text as written. Dates and month names are the
 * app's own and fall back to English instead (`dayLabel`, `monthLabel`).
 */
function drawableText(text: string, encodable: Set<number>): string {
  let out = "";
  // NFC first: a pasted "e" plus a combining accent is one drawable "\u00e9".
  for (const char of text.normalize("NFC")) {
    if (encodes(char, encodable)) out += char;
    else out += /\s/.test(char) ? " " : "?";
  }
  return out;
}

// wrap text to fit within the specified number of characters
function wrapText(text: string, maxChars: number): string[] {
  const wrapped: string[] = [];
  const words = text.split(/\s+/);
  let line = "";

  for (let word of words) {
    if (`${line} ${word}`.trim().length <= maxChars) {
      line += (line ? " " : "") + word;
    } else {
      if (line) wrapped.push(line);
      while (word.length > maxChars) {
        wrapped.push(word.slice(0, maxChars));
        word = word.slice(maxChars);
      }
      line = word;
    }
  }

  if (line) wrapped.push(line);
  return wrapped;
}

// calculate the height of a row based on the column text and how many lines it wraps
function getRowHeight(row: string[]): number {
  let maxLines = 1;

  row.forEach((text, colIndex) => {
    const width = columnWidths[colIndex];
    const maxChars = Math.floor(width / (fontSize * 0.6));
    const lines = wrapText(text, maxChars);
    if (lines.length > maxLines) {
      maxLines = lines.length;
    }
  });

  return maxLines * (fontSize + lineSpacing) + verticalPadding * 2;
}

// draw the text for each cell in the row
function drawRowText(
  page: PDFPage,
  row: string[],
  y: number,
  font: PDFFont,
): void {
  let x = margin;

  row.forEach((text, colIndex) => {
    const width = columnWidths[colIndex];
    const maxChars = Math.floor(width / (fontSize * 0.6));
    const lines = wrapText(text, maxChars);

    lines.forEach((line, i) => {
      page.drawText(line, {
        x,
        y: y - i * (fontSize + lineSpacing),
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    });

    x += width;
  });
}

/**
 * Write the finished document and hand it to the share sheet.
 *
 * Separate from laying the pages out, so that producing the bytes and getting
 * them off the device are two things rather than one. It rejects rather than
 * logging: a failed export used to be indistinguishable from a successful one
 * from the user's side.
 *
 * The file goes to the cache, as the CSV and JSON exports do. It used to go to
 * Documents, which iOS backs up, so a backup held every Day in plaintext beside
 * a database it cannot read. A copy an older export left there is removed by
 * the next PDF export and stays until one runs: neither launch nor Delete Data
 * removes it.
 */
async function shareFinishedPdf(pdfDoc: PDFDocument) {
  const pdfBase64 = await pdfDoc.saveAsBase64();
  try {
    await FileSystem.deleteAsync(`${FileSystem.documentDirectory}ephira.pdf`, {
      idempotent: true,
    });
  } catch {
    // The user is waiting for this export, not for that cleanup; the next
    // export tries again.
    console.warn("Could not remove the PDF an older export left in Documents");
  }
  const pdfPath = `${FileSystem.cacheDirectory}ephira.pdf`;
  await FileSystem.writeAsStringAsync(pdfPath, pdfBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await Sharing.shareAsync(pdfPath, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "Export Ephira data as PDF",
  });
}

const cycleColumns = [
  "Date",
  "Flow",
  "Moods",
  "Symptoms",
  "Medications",
  "Notes",
];
const pregnancyColumns = [
  "Date",
  "Kicks",
  "Moods",
  "Symptoms",
  "Appointments",
  "Notes",
];

/** A cycle Day's cells after its date. */
function cycleRow(entry: ExportDayEntry): string[] {
  const medList = entry.medications.map((m) => m.name).join(", ");

  const bcList = entry.birth_control
    .map((bc) => {
      const detail = birthControlDetail(bc);
      return `${bc.name}${detail ? ` (${detail})` : ""}`;
    })
    .join(", ");

  const combinedMedList = [medList, bcList].filter(Boolean).join(", ");

  return [
    flowMap[entry.flow_intensity] ?? "",
    entry.moods.join(", "),
    entry.symptoms.join(", "),
    combinedMedList,
    entry.notes ?? "",
  ];
}

/** A pregnancy date's cells after its date. */
function pregnancyRow({ day, appointments }: PregnancyExportEntry) {
  return [
    kicksText(day),
    day?.moods.join(", ") ?? "",
    day?.symptoms.join(", ") ?? "",
    appointmentsDetail(appointments),
    day?.notes ?? "",
  ];
}

/**
 * The export as a PDF: cycle Days by month, then pregnancy mode's days and
 * appointments by month under their own heading, from a new page. The website
 * offers the PDF as the copy to hand a provider, so it carries both.
 */
export async function exportPDF(data: ExportData) {
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const encodable = new Set(font.getCharacterSet());
    const canDraw = (label: string) =>
      [...label].every((char) => encodes(char, encodable));

    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    let y = height - margin;
    let pageNum = 1;

    const drawPageNumber = () => {
      const pageCount = pdfDoc.getPages().length;
      const currentPage = pdfDoc.getPages()[pageCount - 1];
      currentPage.drawText(`${pageNum}`, {
        x: width - margin,
        y: margin / 2,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    };

    const addPage = () => {
      drawPageNumber();
      page = pdfDoc.addPage();
      y = height - margin;
      pageNum++;
    };

    const drawSectionTitle = (title: string) => {
      y -= lineHeight * 2;

      page.drawText(title, {
        x: margin,
        y,
        size: fontSize + 6,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
    };

    const drawMonthLabel = (heading: string) => {
      if (y < margin + 5 * lineHeight) {
        addPage();
      }

      y -= lineHeight * 2;

      page.drawText(drawableText(heading, encodable), {
        x: margin,
        y,
        size: fontSize + 2,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1),
      });

      y -= lineHeight;
    };

    // draw the column headers with a line underneath
    const drawColumnHeaders = (columns: string[]) => {
      let x = margin;
      columns.forEach((header, i) => {
        page.drawText(header, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        x += columnWidths[i];
      });
      y -= lineHeight;
      page.drawLine({
        start: { x: margin - 2, y: y + fontSize + 2 },
        end: {
          x: margin + tableWidth,
          y: y + fontSize + 2,
        },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
      y -= 0.5;
    };

    // months are added newest first, e.g. May 2025 -> March 2025. The grouping
    // and the ordering are in services/exportRows.ts, keyed on the date rather
    // than on a localised month name.
    const drawMonths = <T extends { date: string }>(
      entries: T[],
      columns: string[],
      toRow: (entry: T) => string[],
    ) => {
      for (const { key, entries: monthEntries } of groupEntriesByMonth(
        entries,
      )) {
        const label = monthLabel(key, canDraw);
        // add month header & column headers
        drawMonthLabel(label);
        drawColumnHeaders(columns);

        let rowNum = 0;
        for (const entry of monthEntries) {
          const row = [dayLabel(entry.date, canDraw), ...toRow(entry)].map(
            (cell) => drawableText(cell, encodable),
          );
          const rowHeight = getRowHeight(row);

          // check if we need to add a new page, if so, add page and headers
          if (y - rowHeight < margin + lineHeight) {
            addPage();
            drawMonthLabel(`${label} (continued)`);
            drawColumnHeaders(columns);
          }

          // alternating rows will have a light gray background
          if (rowNum % 2 === 1) {
            page.drawRectangle({
              x: margin - 2,
              y: y - rowHeight + lineHeight - verticalPadding * 2,
              width: tableWidth,
              height: rowHeight,
              color: lightGray,
            });
          }

          drawRowText(page, row, y, font);

          y -= rowHeight;
          rowNum++;
        }
      }
    };

    const cycleDays = Object.values(data.dailyData);
    drawMonths(cycleDays, cycleColumns, cycleRow);

    const pregnancyDates = pregnancyEntries(data);
    if (pregnancyDates.length > 0) {
      if (cycleDays.length > 0) addPage();
      drawSectionTitle("Pregnancy");
      drawMonths(pregnancyDates, pregnancyColumns, pregnancyRow);
    }

    drawPageNumber();
    await shareFinishedPdf(pdfDoc);
  } catch (err) {
    console.error("Failed to export PDF:", err);
    // Rethrow: the caller shows the user something. Swallowing this made a
    // failed export look exactly like a successful one.
    throw err;
  }
}
