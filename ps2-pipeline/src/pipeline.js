// Pipeline: one uploaded paper in, review-ready posts out. Each stage writes its
// output to the run folder and its progress to status.json, which the web app
// polls. A failed stage stops the run and records why, so nothing half-made is
// ever shown as ready.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { ingest } from './ingest.js';
import { cite } from './cite.js';
import { extract } from './extract.js';
import { makeContent } from './content.js';
import { render } from './render.js';
import { makeReelScript } from './reel-script.js';
import { makeCover, makeCrops, makeUgcReel } from './reel-ugc.js';
import { generateStill, coverPhotoPrompt } from './stills.js';

export const OUT = path.resolve('out');
const FRAMES = path.resolve('assets/creator');

export const STAGES = [
  ['ingest', 'Reading the paper'],
  ['cite', 'Finding the reference'],
  ['extract', 'Pulling out findings'],
  ['content', 'Writing the posts'],
  ['render', 'Designing carousel and static'],
  ['script', 'Writing the reel script'],
  ['reel', 'Filming the AI reel'],
];

const json = (file, data) => writeFile(file, JSON.stringify(data, null, 2));
const load = async (file) => JSON.parse(await readFile(file, 'utf8'));

export function newStatus(slug, { reel, fileName }) {
  return {
    slug,
    fileName,
    createdAt: new Date().toISOString(),
    state: 'queued',
    reel,
    stages: STAGES.map(([id, label]) => ({ id, label, status: id === 'reel' && !reel ? 'skipped' : 'pending' })),
  };
}

export async function runPipeline(slug) {
  const dir = path.join(OUT, slug);
  const statusFile = path.join(dir, 'status.json');
  const status = await load(statusFile);
  const save = () => json(statusFile, status);

  const stage = async (id, work) => {
    const s = status.stages.find((x) => x.id === id);
    if (s.status === 'skipped') return;
    s.status = 'running';
    s.startedAt = new Date().toISOString();
    await save();
    s.detail = (await work()) || '';
    s.status = 'done';
    s.endedAt = new Date().toISOString();
    await save();
  };

  status.state = 'running';
  status.startedAt = new Date().toISOString();
  await save();

  try {
    const pdf = path.join(dir, 'paper.pdf');
    let doc, paper, findings, content, script;

    await stage('ingest', async () => {
      doc = await ingest(pdf);
      await json(path.join(dir, 'doc.json'), doc);
      return `${doc.pageCount} pages, ${doc.sentences.length} sentences`;
    });

    await stage('cite', async () => {
      paper = { ...(await cite(doc)), sourceFile: status.fileName };
      await json(path.join(dir, 'paper.json'), paper);
      return paper.short;
    });

    await stage('extract', async () => {
      const result = await extract(doc);
      findings = result.findings;
      await json(path.join(dir, 'findings.json'), result);
      if (!result.stats.verified) throw new Error('no finding passed the number check');
      return `${result.stats.verified} of ${result.stats.total} findings verified against the text`;
    });

    await stage('content', async () => {
      content = await makeContent(findings);
      await json(path.join(dir, 'content.json'), content);
      return content.plan.angle;
    });

    await stage('render', async () => {
      const photoFile = path.join(dir, 'posts', 'cover-photo.png');
      await mkdir(path.dirname(photoFile), { recursive: true });
      const photo = await generateStill(coverPhotoPrompt(content.plan), photoFile, { aspectRatio: '4:3' }).catch(() => null);
      const files = await render(content, paper, dir, { photoFile: photo?.file });
      return `${files.length} images${photo ? ', with a topic photo on slide 1' : ', topic photo failed so slide 1 is text only'}`;
    });

    await stage('script', async () => {
      const reelDir = path.join(dir, 'reel-v2');
      await mkdir(reelDir, { recursive: true });
      ({ script } = await makeReelScript(findings, paper));
      await json(path.join(reelDir, 'script.json'), script);
      const crops = await makeCrops(script, findings, pdf, reelDir);
      await makeCover(script, paper, crops, FRAMES, path.join(reelDir, 'cover.png'));
      return `${script.flatMap((p) => p.lines).filter((l) => l.quote).length} lines quote the paper`;
    });

    await stage('reel', async () => {
      const reelDir = path.join(dir, 'reel-v2');
      const out = path.join(dir, 'posts', 'reel.mp4');
      await makeUgcReel(paper, findings, pdf, reelDir, out, script, FRAMES);
      await promisify(execFile)(ffmpegPath, ['-y', '-loglevel', 'error', '-ss', '9', '-i', out, '-frames:v', '1', path.join(reelDir, 'thumb.png')]);
      return '30 second reel';
    });

    status.state = 'done';
  } catch (err) {
    const s = status.stages.find((x) => x.status === 'running');
    if (s) s.status = 'failed';
    status.state = 'failed';
    status.error = err.message;
  }
  status.endedAt = new Date().toISOString();
  status.machineSeconds = Math.round((Date.parse(status.endedAt) - Date.parse(status.startedAt)) / 1000);
  await save();
}
