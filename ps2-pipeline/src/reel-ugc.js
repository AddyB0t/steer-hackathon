// UGC reel: one creator talking to camera, built from approved stills.
//
// Seedance caps a clip at 15 s, so a 20 s reel is two 10 s clips that share a
// middle frame (part A ends on it, part B starts on it), which makes the join
// invisible. Every factual line carries a verbatim quote from the paper; the
// quote is checked against the cited source sentence before anything is billed,
// so the on-screen citation can never drift from the paper.

import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import ffmpegPath from 'ffmpeg-static';
import { generate, uploadFile } from './higgsfield.js';
import { quoteCrop } from './paper-crop.js';
import { fonts } from './fonts.js';

const run = promisify(execFile);
const brand = JSON.parse(await readFile(new URL('../../brand.json', import.meta.url), 'utf8'));
const C = brand.colors;
const W = 720;
const H = 1280;
const MODEL = 'bytedance/seedance-2.0/image-to-video';

const h = (type, style, ...children) => ({ type, props: { style: { display: 'flex', ...style }, children: children.flat() } });

// A script is two parts of three lines. sourceId + quote make a line factual;
// lines without them are editorial and get flagged for doctor sign-off in the
// review gate. `say` is written for the voice (numbers spelled out); `caption`
// is what shows on screen. Scripts live in <run>/reel-v2/script.json.

export function checkQuotes(findings, script) {
  const sentences = new Map(findings.flatMap((f) => f.sources.map((s) => [s.id, s])));
  const problems = [];
  for (const line of script.flatMap((p) => p.lines)) {
    if (!line.sourceId) continue;
    const src = sentences.get(line.sourceId);
    if (!src) problems.push(`${line.sourceId}: not a verified finding source`);
    else if (!line.quote.split(' … ').every((piece) => src.text.includes(piece))) problems.push(`${line.sourceId}: quote not verbatim`);
    else line.page = src.page;
  }
  return problems;
}

function promptFor(part) {
  const shots = part.lines
    .map((l, i) => `Shot ${i + 1}: Same framing. ${l.beat}\nWoman's line (${l.emotion}): "${l.say}"`)
    .join('\n\n');
  return `Single-take smartphone selfie video, front camera, slight handheld micro-movement, no cuts. The woman from the first frame talks directly to the camera in her kitchen.

${shots}

Natural Indian English accent. She speaks slowly and clearly, unhurried, with a short pause between lines. Natural room tone, her voice only. No BGM. No subtitles. No logo. Her hands stay out of frame. Her face, hair, kurta and the kitchen stay exactly the same throughout.`;
}

const CARD_INNER = W - 80 - 48;

export async function captionTree(line, short, crop) {
  const paper = crop
    ? [
        {
          type: 'img',
          props: {
            src: `data:image/png;base64,${(await readFile(crop.file)).toString('base64')}`,
            width: CARD_INNER,
            height: Math.round((CARD_INNER * crop.height) / crop.width),
            style: { borderRadius: 8, border: `1px solid ${C.blush}` },
          },
        },
        h('div', { fontFamily: 'Sans', fontSize: 19, color: C.clay }, `From the paper: ${short}, p. ${line.page}`),
      ]
    : [];
  return h(
    'div',
    { width: W, height: H, flexDirection: 'column', justifyContent: 'space-between', padding: '56px 40px 130px' },
    h('div', { fontFamily: 'Serif', fontSize: 36, color: C.cream }, 'steer'),
    h(
      'div',
      { flexDirection: 'column', gap: 14, background: C.softPaper, borderRadius: 18, padding: '22px 24px', border: `2px solid ${C.blush}` },
      h('div', { fontFamily: 'Serif', fontSize: 36, lineHeight: 1.2, color: C.ink }, line.caption),
      ...paper,
    ),
  );
}

export function endCardTree(paper) {
  return h(
    'div',
    { width: W, height: H, background: C.cream, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 34, padding: 64 },
    h('div', { fontFamily: 'Serif', fontSize: 64, color: C.rust }, 'steer'),
    h('div', { fontFamily: 'Serif', fontSize: 52, color: C.ink, textAlign: 'center', lineHeight: 1.2 }, 'Stop Googling. Ask a doctor.'),
    h('div', { fontFamily: 'Sans', fontSize: 30, color: C.clay }, 'steerclub.com'),
    h('div', { fontFamily: 'Sans', fontSize: 18, color: C.clay, textAlign: 'center', lineHeight: 1.4 }, `Source: ${paper.short}${paper.url ? ` · ${paper.url}` : ''}`),
  );
}

export async function png(tree, file) {
  await writeFile(file, new Resvg(await satori(tree, { width: W, height: H, fonts })).render().asPng());
  return file;
}

const ff = (args) => run(ffmpegPath, ['-y', '-loglevel', 'error', ...args], { maxBuffer: 1 << 26 });

// Line boundaries come from the pauses between spoken lines; if the audio has
// no clear pauses, fall back to equal thirds.
async function lineTimes(file, count) {
  const { stderr } = await run(ffmpegPath, ['-i', file, '-af', 'silencedetect=noise=-32dB:d=0.2', '-f', 'null', '-'], { maxBuffer: 1 << 26 }).catch((e) => e);
  const dur = Number(/Duration: (\d+):(\d+):([\d.]+)/.exec(stderr).slice(1).reduce((t, v) => t * 60 + Number(v), 0));
  const gaps = [...stderr.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)]
    .map(([, end, len]) => ({ mid: Number(end) - Number(len) / 2, len: Number(len) }))
    .filter((g) => g.mid > 1 && g.mid < dur - 1);
  let cuts = gaps.sort((a, b) => b.len - a.len).slice(0, count - 1).map((g) => g.mid).sort((a, b) => a - b);
  if (cuts.length < count - 1) cuts = Array.from({ length: count - 1 }, (_, i) => (dur * (i + 1)) / count);
  const edges = [0, ...cuts, dur];
  return edges.slice(0, -1).map((start, i) => [start, edges[i + 1]]);
}

// Paper crops are cheap and the review page shows them, so they are made even
// when the paid video step is skipped.
export async function makeCrops(script, findings, pdfPath, dir) {
  const problems = checkQuotes(findings, script);
  if (problems.length) throw new Error(`quotes failed verification: ${problems.join('; ')}`);

  const crops = new Map();
  for (const [k, line] of script.flatMap((p) => p.lines.map((l, j) => [`${p.key}-${j + 1}`, l]))) {
    if (line.quote) crops.set(line, await quoteCrop(pdfPath, line.page, line.quote.split(' … '), path.join(dir, `${k}-paper.png`)));
  }
  return crops;
}

// Script-only runs still need a reel cover that belongs to this paper, so it
// shows the key number line and its paper crop over the creator still.
export async function makeCover(script, paper, crops, framesDir, outFile) {
  const lines = script.flatMap((p) => p.lines);
  const line = lines.find((l) => l.quote && /\d/.test(l.caption)) || lines.find((l) => l.quote) || lines[0];
  const card = await png(await captionTree(line, paper.short, crops.get(line)), outFile.replace(/\.png$/, '-card.png'));
  await ff([
    '-i', path.join(framesDir, 'start.png'), '-i', card,
    '-filter_complex', `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}[bg];[bg][1:v]overlay=0:0`,
    '-frames:v', '1', outFile,
  ]);
  return outFile;
}

export async function makeUgcReel(paper, findings, pdfPath, dir, outFile, script, framesDir) {
  const crops = await makeCrops(script, findings, pdfPath, dir);

  const ledgerFile = path.join(dir, 'requests.json');
  const urls = {};
  for (const f of new Set(script.flatMap((p) => [p.from, p.to]))) urls[f] = await uploadFile(path.join(framesDir, f));

  const raws = await Promise.all(
    script.map(async (part, i) => {
      await new Promise((r) => setTimeout(r, i * 3000));
      const { url } = await generate(
        MODEL,
        { prompt: promptFor(part), image_url: urls[part.from], end_image_url: urls[part.to], duration: part.seconds, resolution: '720p', generate_audio: true },
        { key: part.key, ledgerFile },
      );
      const file = path.join(dir, `${part.key}-raw.mp4`);
      await writeFile(file, Buffer.from(await (await fetch(url)).arrayBuffer()));
      return file;
    }),
  );

  const parts = [];
  for (const [i, part] of script.entries()) {
    const times = await lineTimes(raws[i], part.lines.length);
    const overlays = [];
    for (const [j, line] of part.lines.entries()) overlays.push(await png(await captionTree(line, paper.short, crops.get(line)), path.join(dir, `${part.key}-line-${j + 1}.png`)));

    const chain = [`[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=30[v0]`];
    times.forEach(([a, b], j) => chain.push(`[v${j}][${j + 1}:v]overlay=0:0:enable='between(t,${a.toFixed(2)},${b.toFixed(2)})'[v${j + 1}]`));
    const out = path.join(dir, `${part.key}.mp4`);
    await ff([
      '-i', raws[i], ...overlays.flatMap((o) => ['-i', o]),
      '-filter_complex', chain.join(';'),
      '-map', `[v${times.length}]`, '-map', '0:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '44100', '-ac', '2', out,
    ]);
    parts.push(out);
  }

  const card = await png(endCardTree(paper), path.join(dir, 'endcard.png'));
  const cardClip = path.join(dir, 'endcard.mp4');
  await ff([
    '-loop', '1', '-t', '2.5', '-i', card, '-f', 'lavfi', '-t', '2.5', '-i', 'anullsrc=r=44100:cl=stereo',
    '-vf', `scale=${W}:${H},setsar=1,fps=30`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', cardClip,
  ]);
  parts.push(cardClip);

  const streams = parts.map((_, i) => `[${i}:v][${i}:a]`).join('');
  await ff([
    ...parts.flatMap((p) => ['-i', p]),
    '-filter_complex', `${streams}concat=n=${parts.length}:v=1:a=1[v][a]`,
    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', outFile,
  ]);
  return outFile;
}
