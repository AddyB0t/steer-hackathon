// Web app: upload a paper, watch the pipeline run, review every line against
// the paper, publish. Runs are folders under out/; one pipeline job runs at a
// time so two uploads never compete for the same API budget.
//
// Set APP_PASSWORD to put the whole app behind basic auth on a public server.

import http from 'node:http';
import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { OUT, newStatus, runPipeline } from './pipeline.js';
import { buildItems, finalCaption } from './review.js';

const PORT = Number(process.env.PORT || 4321);
const HOST = process.env.HOST || '127.0.0.1';
const PASSWORD = process.env.APP_PASSWORD || '';
const MAX_BYTES = 30 * 1024 * 1024;
const UI_DIR = path.resolve('review-ui/dist');
const TYPES = { '.png': 'image/png', '.mp4': 'video/mp4', '.pdf': 'application/pdf', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff' };

const load = async (file) => JSON.parse(await readFile(file, 'utf8'));
const save = (file, data) => writeFile(file, JSON.stringify(data, null, 2));
const runDir = (slug) => (/^[a-z0-9-]{1,80}$/.test(slug) && existsSync(path.join(OUT, slug, 'status.json')) ? path.join(OUT, slug) : null);

let queue = Promise.resolve();
const enqueue = (slug) => (queue = queue.then(() => runPipeline(slug)).catch((e) => console.error(slug, e)));

// A server restart mid-run would leave a job looking busy forever.
for (const slug of existsSync(OUT) ? await readdir(OUT) : []) {
  const file = path.join(OUT, slug, 'status.json');
  if (!existsSync(file)) continue;
  const s = await load(file);
  if (s.state === 'queued' || s.state === 'running') {
    s.state = 'failed';
    s.error = 'server restarted during this run';
    s.stages.forEach((x) => x.status === 'running' && (x.status = 'failed'));
    await save(file, s);
  }
}

async function listRuns() {
  const runs = [];
  for (const slug of await readdir(OUT)) {
    const dir = runDir(slug);
    if (!dir) continue;
    const status = await load(path.join(dir, 'status.json'));
    const paper = existsSync(path.join(dir, 'paper.json')) ? await load(path.join(dir, 'paper.json')) : null;
    const review = existsSync(path.join(dir, 'review.json')) ? await load(path.join(dir, 'review.json')) : null;
    runs.push({
      slug,
      fileName: status.fileName,
      createdAt: status.createdAt,
      state: status.state,
      title: paper?.title || status.fileName,
      short: paper?.short || '',
      cover: existsSync(path.join(dir, 'posts', 'carousel-01.png')) ? `/files/${slug}/posts/carousel-01.png` : null,
      hasReel: existsSync(path.join(dir, 'posts', 'reel.mp4')),
      publishedAt: review?.publishedAt || null,
    });
  }
  return runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function createRun(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BYTES) return { status: 413, body: { error: 'PDF is larger than 30 MB' } };
    chunks.push(c);
  }
  const bytes = Buffer.concat(chunks);
  if (bytes.subarray(0, 5).toString() !== '%PDF-') return { status: 400, body: { error: 'that file is not a PDF' } };

  const fileName = path.basename(decodeURIComponent(req.headers['x-filename'] || 'paper.pdf')).slice(0, 120);
  const base = fileName.replace(/\.pdf$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'paper';
  const slug = `${base}-${Date.now().toString(36)}`;
  const dir = path.join(OUT, slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'paper.pdf'), bytes);
  await save(path.join(dir, 'status.json'), newStatus(slug, { reel: req.headers['x-reel'] === '1', fileName }));
  enqueue(slug);
  return { status: 201, body: { slug } };
}

async function reviewState(dir) {
  const { paper, content, items, hasReel } = await buildItems(dir);
  const file = path.join(dir, 'review.json');
  const review = existsSync(file) ? await load(file) : { startedAt: null, decisions: {} };
  if (!review.startedAt) {
    review.startedAt = new Date().toISOString();
    await save(file, review);
  }
  const { stats } = await load(path.join(dir, 'findings.json'));
  const { pageCount, sentences } = await load(path.join(dir, 'doc.json'));
  const facts = { pages: pageCount, sentences: sentences.length, verified: stats.verified, total: stats.total, quotes: items.filter((i) => i.post === 'Reel' && i.image).length };
  return { paper, angle: content.plan.angle, reasoning: content.plan.reasoning, items, hasReel, facts, decisions: review.decisions, publishedAt: review.publishedAt || null };
}

async function decide(dir, body) {
  const { items } = await buildItems(dir);
  const { id, status, note } = body;
  if (!items.some((i) => i.id === id) || !['approved', 'rejected'].includes(status)) return { status: 400, body: { error: 'bad decision' } };
  const file = path.join(dir, 'review.json');
  const review = await load(file);
  review.decisions[id] = { status, note: note || '', at: new Date().toISOString() };
  await save(file, review);
  return { status: 200, body: { ok: true } };
}

async function publish(dir) {
  const { paper, content, items, hasReel } = await buildItems(dir);
  const file = path.join(dir, 'review.json');
  const review = await load(file);
  const pending = items.filter((i) => review.decisions[i.id]?.status !== 'approved');
  if (pending.length) return { status: 409, body: { error: 'not every line is approved', pending: pending.map((i) => i.id) } };

  const out = path.join(dir, 'approved');
  await mkdir(out, { recursive: true });
  const posts = [...(hasReel ? ['reel.mp4'] : []), 'static.png', ...content.plan.carousel.slides.map((_, i) => `carousel-${String(i + 1).padStart(2, '0')}.png`)];
  for (const f of posts) await copyFile(path.join(dir, 'posts', f), path.join(out, f));
  const tags = (content.plan.hashtags || []).map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ');
  await writeFile(path.join(out, 'caption.txt'), `${finalCaption(content.plan.caption, paper)}\n\n${tags}\n`);
  await writeFile(path.join(out, 'caption-hinglish.txt'), `${finalCaption(content.plan.captionHinglish, paper)}\n\n${tags}\n`);

  review.publishedAt = new Date().toISOString();
  review.reviewMinutes = Number(((Date.parse(review.publishedAt) - Date.parse(review.startedAt)) / 60000).toFixed(1));
  await save(file, review);
  return { status: 200, body: { ok: true, reviewMinutes: review.reviewMinutes } };
}

const sendFile = async (res, file, root) => {
  if (!file.startsWith(root + path.sep) || !existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(await readFile(file));
};

const authorised = (req) => {
  if (!PASSWORD) return true;
  const [, token] = (req.headers.authorization || '').split(' ');
  const pass = Buffer.from(token || '', 'base64').toString().split(':').slice(1).join(':');
  return pass === PASSWORD;
};

http
  .createServer(async (req, res) => {
    const json = (status, body) => res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
    try {
      if (!authorised(req)) return res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Receipts"' }).end();
      const url = new URL(req.url, 'http://x');
      const parts = url.pathname.split('/').filter(Boolean);

      if (url.pathname === '/api/runs' && req.method === 'GET') return json(200, await listRuns());
      if (url.pathname === '/api/runs' && req.method === 'POST') {
        const r = await createRun(req);
        return json(r.status, r.body);
      }

      if (parts[0] === 'api' && parts[1] === 'runs' && parts[2]) {
        const dir = runDir(parts[2]);
        if (!dir) return json(404, { error: 'no such run' });
        const action = parts[3];
        if (action === 'status') return json(200, await load(path.join(dir, 'status.json')));
        if (action === 'state') return json(200, await reviewState(dir));
        if (action === 'decide' && req.method === 'POST') {
          let raw = '';
          for await (const c of req) raw += c;
          const r = await decide(dir, JSON.parse(raw));
          return json(r.status, r.body);
        }
        if (action === 'publish' && req.method === 'POST') {
          const r = await publish(dir);
          return json(r.status, r.body);
        }
        return json(404, { error: 'unknown action' });
      }

      if (parts[0] === 'files' && parts[1]) {
        const dir = runDir(parts[1]);
        if (!dir) return res.writeHead(404).end();
        return sendFile(res, path.resolve(dir, decodeURIComponent(parts.slice(2).join('/'))), dir);
      }

      if (parts[0] === 'assets' || url.pathname === '/favicon.svg') return sendFile(res, path.resolve(UI_DIR, url.pathname.slice(1)), UI_DIR);
      if (parts[0] === 'api') return json(404, { error: 'not found' });

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(await readFile(path.join(UI_DIR, 'index.html')));
    } catch (err) {
      console.error(err);
      json(500, { error: err.message });
    }
  })
  .listen(PORT, HOST, () => console.log(`receipts: http://localhost:${PORT}`));
