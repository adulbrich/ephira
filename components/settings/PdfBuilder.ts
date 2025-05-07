import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { ExportData } from "../../constants/Interfaces";

const fontSize = 10;
const verticalPadding = 2;
const lineHeight = 16;
const lineSpacing = 2;
const margin = 20;
const columnWidths = [50, 50, 110, 110, 120, 120];
const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
const flowMap = ["", "Spotting", "Light", "Medium", "Heavy"];
const lightGray = rgb(0.95, 0.95, 0.95);

const MONTH_INDEX: Record<string, number> = {
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  May: 4,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11,
};

// wrap text to fit within the specified number of characters
function wrapText(text: string, maxChars: number): string[] {
  const wrapped: string[] = [];
  const words = text.split(/\s+/);
  let line = "";

  for (let word of words) {
    if ((line + " " + word).trim().length <= maxChars) {
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

async function exportFinishedPdf(pdfDoc: PDFDocument) {
  const pdfBase64 = await pdfDoc.saveAsBase64();
  const pdfPath = `${FileSystem.documentDirectory}ephira.pdf`;
  await FileSystem.writeAsStringAsync(pdfPath, pdfBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await Sharing.shareAsync(pdfPath, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "Export Ephira data as PDF",
  });
}

export async function exportPDF(dailyData: ExportData["dailyData"]) {
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();
    let y = height - margin;
    let currentMonth = "";
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

    // draw the column headers with a line underneath
    const drawColumnHeaders = () => {
      let x = margin;
      ["Date", "Flow", "Moods", "Symptoms", "Medications", "Notes"].forEach(
        (header, i) => {
          page.drawText(header, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0.2, 0.2, 0.2),
          });
          x += columnWidths[i];
        },
      );
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

    // group entries by month/year so we can sort them
    const entriesGroupedByMonth: Record<string, ExportData["dailyData"]> = {};
    for (const entry of Object.values(dailyData)) {
      const dateObj = new Date(entry.date);
      const monthKey = dateObj.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });

      if (!entriesGroupedByMonth[monthKey]) {
        entriesGroupedByMonth[monthKey] = {};
      }

      entriesGroupedByMonth[monthKey][entry.date] = entry;
    }

    const sortedMonthKeys = Object.keys(entriesGroupedByMonth).sort((a, b) => {
      const [monthA, yearA] = a.split(" ");
      const [monthB, yearB] = b.split(" ");

      const timeA = Date.UTC(Number(yearA), MONTH_INDEX[monthA]);
      const timeB = Date.UTC(Number(yearB), MONTH_INDEX[monthB]);

      return timeB - timeA;
    });

    // months will be added to the PDF in reverse order, e.g. May 2025 -> March 2025
    for (const monthLabel of sortedMonthKeys) {
      const entries = Object.values(entriesGroupedByMonth[monthLabel]).sort(
        (a, b) => a.date.localeCompare(b.date),
      );

      let rowNum = 0;
      for (const entry of entries) {
        const entryDate = new Date(entry.date);
        const monthLabel = entryDate.toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
        const dayLabel = entryDate.toLocaleString("default", {
          weekday: "short",
          day: "2-digit",
        });

        // add a new month header if the month has changed
        if (monthLabel !== currentMonth) {
          currentMonth = monthLabel;

          if (y < margin + 5 * lineHeight) {
            addPage();
          }

          y -= lineHeight * 2;

          page.drawText(monthLabel, {
            x: margin,
            y,
            size: fontSize + 2,
            font: boldFont,
            color: rgb(0.1, 0.1, 0.1),
          });

          y -= lineHeight;
          drawColumnHeaders();
        }

        const medList = entry.medications.map((m) => m.name).join(", ");

        const bcList = entry.birth_control
          .map((bc) => {
            let str = "";
            if (bc.time_taken) str += `Time: ${bc.time_taken}`;
            if (bc.notes) str += `${str ? ", " : ""}Notes: ${bc.notes}`;
            return `${bc.name}${str ? ` (${str})` : ""}`;
          })
          .join(", ");

        const combinedMedList = [medList, bcList].filter(Boolean).join(", ");

        const row = [
          dayLabel,
          flowMap[entry.flow_intensity ?? 0],
          entry.moods.join(", "),
          entry.symptoms.join(", "),
          combinedMedList,
          entry.notes ?? "",
        ];

        const rowHeight = getRowHeight(row);

        // check if we need to add a new page, if so, add page and headers
        if (y - rowHeight < margin + lineHeight) {
          addPage();
          drawColumnHeaders();
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

    drawPageNumber();
    await exportFinishedPdf(pdfDoc);
  } catch (err) {
    console.error("Failed to export PDF:", err);
  }
}
