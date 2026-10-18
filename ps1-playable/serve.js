// Static host for the games plus a leads endpoint. Leads go to leads.jsonl,
// one JSON object per line, so the care team can read them without a database.

import http from 'node:http';
import { readFile, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4400);
const HOST = process.env.HOST || '127.0.0.1';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const clip = (v, n) => String(v ?? '').slice(0, n);

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/leads' && req.method === 'POST') {
      let raw = '';
      for await (const c of req) {
        raw += c;
        if (raw.length > 4000) return res.writeHead(413).end();
      }
      try {
        const b = JSON.parse(raw);
        if (!b.name || !/^[0-9+ ]{10,15}$/.test(b.phone || '')) return res.writeHead(400).end();
        const lead = {
          at: new Date().toISOString(),
          game: clip(b.game, 20),
          name: clip(b.name, 60),
          phone: clip(b.phone, 15),
          city: clip(b.city, 40),
          doubts: (Array.isArray(b.doubts) ? b.doubts : []).slice(0, 6).map((d) => clip(d, 20)),
          food: clip(b.food, 10),
          result: clip(b.result, 300),
          src: clip(b.src, 20),
          wrong: (Array.isArray(b.wrong) ? b.wrong : []).slice(0, 15).map((w) => clip(w, 80)),
        };
        await appendFile(path.join(ROOT, 'leads.jsonl'), JSON.stringify(lead) + '\n');
        return res.writeHead(201, { 'Content-Type': 'application/json' }).end('{"ok":true}');
      } catch {
        return res.writeHead(400).end();
      }
    }

    let file = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT)) return res.writeHead(404).end();
    if (existsSync(file) && !path.extname(file)) file = path.join(file, 'index.html');
    if (!existsSync(file) || path.basename(file) === 'leads.jsonl' || file.endsWith('serve.js')) return res.writeHead(404).end();
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(await readFile(file));
  })
  .listen(PORT, HOST, () => console.log(`games: http://localhost:${PORT}`));
