// Render: carousel slides and the static post as 1080x1350 PNGs, straight from
// the brand tokens. No Canva step, so a run never waits on a human.
//
// Each slide prints its own source and page in the footer. Traceability is not
// only in the review sheet; it is on the post a reader sees.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { fonts } from './fonts.js';

const brand = JSON.parse(await readFile(new URL('../../brand.json', import.meta.url), 'utf8'));
const C = brand.colors;
const W = 1080;
const H = 1350;

const h = (type, style, ...children) => ({ type, props: { style: { display: 'flex', ...style }, children: children.flat() } });

// Split a headline so the brand's upright/italic mix lands on the chosen phrase.
// Satori wraps flex children as whole blocks, so each word is its own child;
// otherwise a mixed headline breaks at the style boundary instead of between words.
function headline(text, italic, color, size) {
  const start = italic && text.includes(italic) ? text.indexOf(italic) : -1;
  const end = start === -1 ? -1 : start + italic.length;

  let cursor = 0;
  const words = text.split(' ').map((word) => {
    const at = cursor;
    cursor += word.length + 1;
    const isItalic = start !== -1 && at >= start && at < end;
    return h('span', { fontStyle: isItalic ? 'italic' : 'normal', marginRight: size * 0.26 }, word);
  });

  return h('div', { fontFamily: 'Serif', fontSize: size, lineHeight: 1.12, color, flexWrap: 'wrap' }, words);
}

function sourceLine(findingIds, findings, short) {
  const pages = [...new Set(findingIds.flatMap((id) => findings.find((f) => f.id === id)?.sources.map((s) => s.page) || []))].sort((a, b) => a - b);
  return pages.length ? `Source: ${short}, p. ${pages.join(', ')}` : '';
}

// Cover with a topic photo: the photo fills the top, the hook sits on the brand
// colour below, so the post still reads as steer before it reads as stock.
function photoCoverTree({ title, italic, body, source, total, photo }) {
  const PHOTO_H = 700;
  return h(
    'div',
    { width: W, height: H, background: C.maroon, flexDirection: 'column' },
    h('div', { position: 'relative', width: W, height: PHOTO_H },
      { type: 'img', props: { src: photo, width: W, height: PHOTO_H, style: { width: W, height: PHOTO_H, objectFit: 'cover' } } },
      h('div', { position: 'absolute', top: 0, left: 0, right: 0, justifyContent: 'space-between', alignItems: 'flex-start', height: 220, padding: '56px 96px', fontFamily: 'Sans', fontSize: 30, color: C.cream, backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0))' },
        h('div', { fontFamily: 'Serif', fontSize: 44, color: C.cream }, 'steer'),
        h('div', {}, `1 / ${total}`),
      ),
    ),
    h('div', { flex: 1, flexDirection: 'column', justifyContent: 'space-between', padding: '56px 96px 64px' },
      h('div', { flexDirection: 'column', gap: 28 },
        headline(title, italic, C.cream, title.length > 60 ? 60 : 72),
        body ? h('div', { fontFamily: 'Sans', fontSize: 32, lineHeight: 1.4, color: C.blush }, body) : h('div', {}, ''),
      ),
      h('div', { flexDirection: 'column', gap: 10, fontFamily: 'Sans', fontSize: 22, color: C.blush },
        source ? h('div', {}, source) : h('div', {}, ''),
        h('div', {}, 'steerclub.com'),
      ),
    ),
  );
}

function slideTree({ title, italic, body, source, index, total, dark, photo }) {
  if (photo) return photoCoverTree({ title, italic, body, source, total, photo });
  const bg = dark ? C.maroon : C.cream;
  const head = dark ? C.cream : C.rust;
  const text = dark ? C.blush : C.ink;
  const small = dark ? C.blush : C.clay;

  return h(
    'div',
    { width: W, height: H, background: bg, flexDirection: 'column', justifyContent: 'space-between', padding: '96px 96px 80px' },
    h('div', { justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Sans', fontSize: 30, color: small },
      h('div', { fontFamily: 'Serif', fontSize: 44, color: head }, 'steer'),
      total ? h('div', {}, `${index} / ${total}`) : h('div', {}, ''),
    ),
    h('div', { flexDirection: 'column', gap: 48 },
      headline(title, italic, head, title.length > 70 ? 70 : 84),
      h('div', { width: 120, height: 3, background: dark ? C.rust : C.blush }),
      body ? h('div', { fontFamily: 'Sans', fontSize: 40, lineHeight: 1.45, color: text }, body) : h('div', {}, ''),
    ),
    h('div', { flexDirection: 'column', gap: 14, fontFamily: 'Sans', fontSize: 24, color: small },
      source ? h('div', {}, source) : h('div', {}, ''),
      h('div', {}, 'steerclub.com'),
    ),
  );
}

async function toPng(tree, file) {
  const svg = await satori(tree, { width: W, height: H, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  await writeFile(file, png);
  return file;
}

export async function render(content, paper, outDir, { photoFile } = {}) {
  const { plan, findings } = content;
  const dir = path.join(outDir, 'posts');
  await mkdir(dir, { recursive: true });
  const photo = photoFile ? `data:image/png;base64,${(await readFile(photoFile)).toString('base64')}` : null;

  const slides = plan.carousel.slides;
  const files = [];

  for (const [i, s] of slides.entries()) {
    files.push(
      await toPng(
        slideTree({
          title: s.headline,
          italic: s.italic,
          body: s.body,
          source: sourceLine(s.findingIds || [], findings, paper.short),
          index: i + 1,
          total: slides.length,
          dark: i === 0,
          photo: i === 0 ? photo : null,
        }),
        path.join(dir, `carousel-${String(i + 1).padStart(2, '0')}.png`),
      ),
    );
  }

  files.push(
    await toPng(
      slideTree({
        title: plan.static.headline,
        italic: plan.static.italic,
        body: plan.static.sub,
        source: sourceLine(plan.static.findingIds || [], findings, paper.short),
      }),
      path.join(dir, 'static.png'),
    ),
  );

  return files;
}
