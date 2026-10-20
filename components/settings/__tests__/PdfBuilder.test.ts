import {
  PDFArray,
  PDFDocument,
  PDFRawStream,
  decodePDFRawStream,
} from "pdf-lib";
import { exportPDF } from "@/components/settings/PdfBuilder";
import type { ExportData, ExportDayEntry } from "@/constants/Interfaces";

const written: string[] = [];

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///documents/",
  EncodingType: { Base64: "base64" },
  writeAsStringAsync: async (_path: string, contents: string) => {
    written.push(contents);
  },
}));
jest.mock("expo-sharing", () => ({ shareAsync: async () => undefined }));

/** The text drawn on each page of the PDF exportPDF wrote, one line per draw. */
async function pagesOfText(data: ExportData): Promise<string[]> {
  written.length = 0;
  await exportPDF(data);
  const doc = await PDFDocument.load(written[0]);

  return doc.getPages().map((page) => {
    const contents = page.node.Contents();
    const streams =
      contents instanceof PDFArray
        ? contents.asArray().map((ref) => doc.context.lookup(ref))
        : [contents];

    const lines: string[] = [];
    for (const stream of streams) {
      if (!(stream instanceof PDFRawStream)) continue;
      const operators = Buffer.from(decodePDFRawStream(stream).decode());
      // pdf-lib writes standard-font text as a hex string shown with Tj.
      for (const [, hex] of operators
        .toString("latin1")
        .matchAll(/<([0-9A-Fa-f]*)>\s*Tj/g)) {
        lines.push(Buffer.from(hex, "hex").toString("latin1"));
      }
    }
    return lines.join("\n");
  });
}

const cycleDay: ExportDayEntry = {
  date: "2026-06-01",
  flow_intensity: 3,
  notes: "cramps all day",
  moods: ["Sad"],
  symptoms: ["Cramps"],
  medications: [{ name: "Ibuprofen" }],
  birth_control: [],
};

const data: ExportData = {
  headers: {
    base_header: [],
    moods: [],
    symptoms: [],
    medications: [],
    birth_control: [],
  },
  dailyData: { "2026-06-01": cycleDay },
  pregnancyDays: {
    "2026-09-15": {
      kicks: 14,
      symptoms: ["Heartburn"],
      moods: ["Anxious"],
      notes: "moved after dinner",
    },
  },
  pregnancyAppointments: {
    "2026-10-05": [{ title: "Checkup", type: "OB Visit" }],
  },
};

describe("exportPDF", () => {
  it("puts pregnancy data under its own heading, from a new page", async () => {
    const [cycle, pregnancy, ...rest] = await pagesOfText(data);

    expect(rest).toEqual([]);
    expect(cycle).toContain("cramps all day");
    expect(cycle).not.toContain("Pregnancy");
    expect(pregnancy.split("\n")[0]).toBe("Pregnancy");
    for (const text of [
      "Kicks",
      "Appointments",
      "14",
      "Heartburn",
      "Anxious",
      "moved after dinner",
      "Checkup (OB Visit)",
    ]) {
      expect(pregnancy).toContain(text);
    }
  });

  it("starts on the pregnancy heading when there are no cycle days", async () => {
    const pages = await pagesOfText({ ...data, dailyData: {} });

    expect(pages).toHaveLength(1);
    expect(pages[0].split("\n")[0]).toBe("Pregnancy");
  });

  it("adds nothing when there is no pregnancy data", async () => {
    const pages = await pagesOfText({
      ...data,
      pregnancyDays: {},
      pregnancyAppointments: {},
    });

    expect(pages).toHaveLength(1);
    expect(pages[0]).not.toContain("Pregnancy");
    expect(pages[0]).not.toContain("Kicks");
  });
});
