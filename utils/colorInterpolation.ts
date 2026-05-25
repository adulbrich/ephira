const hexToRgb = (hex: string) => {
  const safeHex = hex.replace("#", "");
  const bigint = Number.parseInt(safeHex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

export const interpolateHexColor = (
  startHex: string,
  endHex: string,
  t: number,
) => {
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);
  return rgbToHex(
    start.r + (end.r - start.r) * t,
    start.g + (end.g - start.g) * t,
    start.b + (end.b - start.b) * t,
  );
};
