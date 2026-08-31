"use node";

import sharp from "sharp";

const GRID_COLS = 5;
const GRID_ROWS = 8;
const ROW_LETTERS = "ABCDEFGH";
const LINE_COLOR = "rgba(255,255,0,0.45)";
const LABEL_BG = "rgba(0,0,0,0.55)";
const LABEL_FG = "#fff";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function overlayGrid(imageBuffer: Buffer): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const w = meta.width ?? 1080;
  const h = meta.height ?? 1920;

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

  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 80 })
    .toBuffer();
}

export function cellToBox(
  cell: string,
): { x: number; y: number; width: number; height: number } | null {
  if (!cell || cell.length < 2 || cell.length > 3) return null;

  const rowChar = cell[0].toUpperCase();
  const colStr = cell.slice(1);
  const rowIndex = ROW_LETTERS.indexOf(rowChar);
  const colNum = Number.parseInt(colStr, 10);

  if (rowIndex < 0 || rowIndex >= GRID_ROWS) return null;
  if (!Number.isFinite(colNum) || colNum < 1 || colNum > GRID_COLS) return null;

  const colIndex = colNum - 1;
  return {
    x: colIndex / GRID_COLS,
    y: rowIndex / GRID_ROWS,
    width: 1 / GRID_COLS,
    height: 1 / GRID_ROWS,
  };
}
