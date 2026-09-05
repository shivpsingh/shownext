"use node";

import sharp from "sharp";

const MAX_LONG_EDGE = 2048;
const MAX_SHORT_EDGE = 1024;
const JPEG_QUALITY = 85;

const ALLOWED_FORMATS = new Set(["jpeg", "jpg", "png", "webp"]);
const MAX_INPUT_PIXELS = 25_000_000;

const GRID_COLS = 6;
const GRID_ROWS = 10;
const ROW_LETTERS = "ABCDEFGHIJ";
const LINE_COLOR = "rgba(255,255,0,0.45)";
const LABEL_BG = "rgba(0,0,0,0.55)";
const LABEL_FG = "#fff";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type PreparedImage = {
  clean: Buffer;
  gridded: Buffer | null;
  width: number;
  height: number;
};

export async function prepareImageForAnalysis(
  imageBuffer: Buffer,
  opts: { useGrid?: boolean } = {},
): Promise<PreparedImage> {
  const useGrid = opts.useGrid ?? false;

  let pipeline = sharp(imageBuffer, { limitInputPixels: MAX_INPUT_PIXELS }).rotate(); // auto-orient via EXIF

  const meta = await pipeline.metadata();
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new Error("Unsupported image format. Use a JPEG, PNG, or WebP screenshot.");
  }

  let w = meta.width ?? 1024;
  let h = meta.height ?? 1024;

  const longEdge = Math.max(w, h);
  const shortEdge = Math.min(w, h);

  let needsResize = false;
  let targetW = w;
  let targetH = h;

  if (longEdge > MAX_LONG_EDGE) {
    const scale = MAX_LONG_EDGE / longEdge;
    targetW = Math.round(w * scale);
    targetH = Math.round(h * scale);
    needsResize = true;
  }

  if (!needsResize && shortEdge > MAX_SHORT_EDGE) {
    const scale = MAX_SHORT_EDGE / shortEdge;
    targetW = Math.round(w * scale);
    targetH = Math.round(h * scale);
    needsResize = true;
  }

  if (needsResize) {
    pipeline = pipeline.resize({ width: targetW, height: targetH, fit: "inside" });
  }

  const clean = await pipeline.jpeg({ quality: JPEG_QUALITY }).toBuffer();

  const finalMeta = await sharp(clean).metadata();
  w = finalMeta.width ?? targetW;
  h = finalMeta.height ?? targetH;

  let gridded: Buffer | null = null;
  if (useGrid) {
    const svg = buildGridSvg(w, h);
    gridded = await sharp(clean)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  return { clean, gridded, width: w, height: h };
}

function buildGridSvg(w: number, h: number): string {
  const cellW = w / GRID_COLS;
  const cellH = h / GRID_ROWS;
  const fontSize = Math.max(12, Math.round(Math.min(cellW, cellH) * 0.18));
  const lineWidth = Math.max(1, Math.round(Math.min(w, h) * 0.002));

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`;

  for (let col = 1; col < GRID_COLS; col++) {
    const x = Math.round(col * cellW);
    svg += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${LINE_COLOR}" stroke-width="${lineWidth}"/>`;
  }
  for (let row = 1; row < GRID_ROWS; row++) {
    const y = Math.round(row * cellH);
    svg += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${LINE_COLOR}" stroke-width="${lineWidth}"/>`;
  }

  const padX = Math.round(fontSize * 0.3);
  const padY = Math.round(fontSize * 0.15);
  const boxW = fontSize * 1.6 + padX * 2;
  const boxH = fontSize + padY * 2;

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const label = `${ROW_LETTERS[row]}${col + 1}`;
      const cx = Math.round(col * cellW + cellW / 2 - boxW / 2);
      const cy = Math.round(row * cellH + cellH / 2 - boxH / 2);
      svg += `<rect x="${cx}" y="${cy}" width="${boxW}" height="${boxH}" rx="3" fill="${LABEL_BG}"/>`;
      svg += `<text x="${cx + boxW / 2}" y="${cy + boxH / 2 + fontSize * 0.35}" text-anchor="middle" font-family="monospace" font-size="${fontSize}" fill="${escapeXml(LABEL_FG)}">${escapeXml(label)}</text>`;
    }
  }

  svg += "</svg>";
  return svg;
}
