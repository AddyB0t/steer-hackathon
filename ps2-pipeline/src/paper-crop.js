// Paper crops: render the real PDF page and highlight the quoted words, so the
// reel shows the source itself instead of retyped text.
//
// Matching runs on a letters-and-digits-only stream because PDF text items
// split words at line ends and hyphenate across lines; positions inside an item
// are interpolated by character, which is close enough for a highlighter mark.

import { readFile, writeFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const SCALE = 3;
const HIGHLIGHT = 'rgba(192, 78, 42, 0.42)';

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function locate(items, piece) {
  const stream = [];
  items.forEach((item, i) => {
    [...item.str].forEach((ch, c) => {
      if (/[a-z0-9]/i.test(ch)) stream.push({ ch: ch.toLowerCase(), i, c });
    });
  });
  const at = stream.map((s) => s.ch).join('').indexOf(norm(piece));
  if (at === -1) return null;
  return stream.slice(at, at + norm(piece).length);
}

function rects(items, chars, viewport, ctx, tail) {
  const byItem = new Map();
  for (const { i, c } of chars) {
    const r = byItem.get(i) || { from: c, to: c };
    byItem.set(i, { from: Math.min(r.from, c), to: Math.max(r.to, c) });
  }
  const last = chars.at(-1);
  byItem.get(last.i).to = Math.min(last.c + tail, items[last.i].str.length - 1);

  // Proportional fonts: place offsets by measured width, not character count.
  ctx.font = '40px sans-serif';
  const frac = (str, n) => ctx.measureText(str.slice(0, n)).width / ctx.measureText(str).width;

  return [...byItem].map(([i, { from, to }]) => {
    const it = items[i];
    const [, , , d, e, f] = it.transform;
    const size = Math.abs(d) || it.height;
    const x1 = e + it.width * frac(it.str, from);
    const x2 = e + it.width * frac(it.str, to + 1);
    const [vx1, vy] = viewport.convertToViewportPoint(x1, f);
    const [vx2] = viewport.convertToViewportPoint(x2, f);
    return { x: vx1, y: vy - size * SCALE * 0.95, w: vx2 - vx1, h: size * SCALE * 1.25 };
  });
}

export async function quoteCrop(pdfPath, pageNo, pieces, outFile) {
  const pdf = await getDocument({ data: new Uint8Array(await readFile(pdfPath)) }).promise;
  const page = await pdf.getPage(pageNo);
  const viewport = page.getViewport({ scale: SCALE });
  // pdfjs ships its own @napi-rs/canvas build; canvases from another copy reject its Path2D glyphs.
  const { canvas, context: ctx } = pdf.canvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;

  const { items } = await page.getTextContent();
  const marks = pieces.flatMap((p) => {
    const chars = locate(items, p);
    if (!chars) throw new Error(`quote not found on p. ${pageNo}: "${p}"`);
    return rects(items, chars, viewport, ctx, p.length - p.search(/[^a-z0-9]*$/i));
  });

  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = HIGHLIGHT;
  for (const m of marks) ctx.fillRect(m.x - 2, m.y, m.w + 4, m.h);

  const minX = Math.min(...marks.map((m) => m.x));
  const maxX = Math.max(...marks.map((m) => m.x + m.w));
  const minY = Math.min(...marks.map((m) => m.y));
  const maxY = Math.max(...marks.map((m) => m.y + m.h));
  const width = Math.min(Math.max(maxX - minX + 120, 1100), canvas.width);
  const cx = Math.max(0, Math.min((minX + maxX) / 2 - width / 2, canvas.width - width));
  const cy = Math.max(0, minY - 110);
  const height = Math.min(maxY + 110, canvas.height) - cy;

  const crop = pdf.canvasFactory.create(Math.round(width), Math.round(height));
  crop.context.drawImage(canvas, cx, cy, width, height, 0, 0, width, height);
  await writeFile(outFile, crop.canvas.toBuffer('image/png'));
  return { file: outFile, width, height };
}
