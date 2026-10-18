// Ingest: a PDF path or URL goes in, a sentence-addressed document comes out.
//
// Every sentence gets a stable id (p3-s12 = page 3, sentence 12). Everything
// downstream cites those ids, so any claim in a finished post can be walked
// back to the exact sentence a doctor needs to read. This is the spine of the
// review gate, which is why it lives at the very first step rather than being
// reconstructed later by fuzzy matching.

import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const ABBREVIATIONS = [
  'e.g', 'i.e', 'et al', 'vs', 'cf', 'approx', 'Fig', 'Dr', 'Prof', 'No',
  'Mr', 'Mrs', 'Ms', 'St', 'Jr', 'Sr', 'ca', 'viz',
];

async function fetchPdfBytes(source) {
  if (/^https?:\/\//i.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Could not fetch ${source}: HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }
  return new Uint8Array(await readFile(source));
}

// pdf.js gives us positioned text fragments, not lines. Joining them naively
// welds words together, so we insert a space whenever the next fragment starts
// to the right of where the previous one ended, and a newline on a y jump.
function fragmentsToText(items) {
  let text = '';
  let prevY = null;
  let prevEndX = null;

  for (const item of items) {
    if (!item.str) continue;
    const [, , , , x, y] = item.transform;

    if (prevY !== null && Math.abs(y - prevY) > 2) {
      text += '\n';
    } else if (prevEndX !== null && x - prevEndX > 1) {
      text += ' ';
    }

    text += item.str;
    prevY = y;
    prevEndX = x + (item.width ?? 0);
  }

  return text;
}

// Papers are full of hyphenated line breaks and hard-wrapped columns. Both
// break sentence splitting badly if left in.
function normalise(text) {
  return text
    .replace(/-\n\s*/g, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function splitSentences(text) {
  const guard = new RegExp(`\\b(${ABBREVIATIONS.join('|')})\\.`, 'g');
  const masked = text.replace(guard, (m) => m.replace('.', '\u0000'));

  return masked
    .split(/(?<=[.!?])\s+(?=[A-Z(\u201c"])/)
    .map((s) => s.replace(/\u0000/g, '.').trim())
    .filter((s) => s.length > 0);
}

export async function ingest(source) {
  const bytes = await fetchPdfBytes(source);
  const pdf = await getDocument({ data: bytes, useSystemFonts: true }).promise;
  const meta = await pdf.getMetadata().catch(() => ({ info: {} }));

  const sentences = [];
  const pages = [];

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const raw = normalise(fragmentsToText(content.items));
    pages.push({ page: pageNo, text: raw });

    splitSentences(raw).forEach((text, i) => {
      sentences.push({ id: `p${pageNo}-s${i + 1}`, page: pageNo, text });
    });
  }

  return {
    source,
    title: meta.info?.Title?.trim() || null,
    pageCount: pdf.numPages,
    pages,
    sentences,
  };
}
