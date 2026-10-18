// Resilient Higgsfield queue client for the pipeline.
//
// The SDK's subscribe() holds the request id only in memory and throws on a
// single dropped connection, which loses an already-billed generation. Here the
// request id is persisted the moment it exists, polling survives network
// errors, and a rerun resumes the saved request instead of paying again.
// Errors are reduced to a message so request headers never reach a log.

import { readFile, writeFile } from 'node:fs/promises';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });

const BASE = 'https://api.higgsfield.ai';

function auth() {
  if (!process.env.HF_CREDENTIALS) throw new Error('HF_CREDENTIALS missing from .env.local');
  return { Authorization: `Key ${process.env.HF_CREDENTIALS}`, 'Content-Type': 'application/json' };
}

async function request(method, url, body) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { method, headers: auth(), body: body ? JSON.stringify(body) : undefined });
      const text = await res.text();
      if (res.status >= 500 || res.status === 429) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) return { error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
      return JSON.parse(text);
    } catch (err) {
      if (attempt >= 6) throw new Error(`Higgsfield unreachable after ${attempt} attempts: ${err.message}`);
      await new Promise((r) => setTimeout(r, Math.min(30000, 2000 * attempt)));
    }
  }
}

// Higgsfield models take input media by public URL, so local frames go through
// a presigned upload first. Credentials never go to the storage URL.
export async function uploadFile(file, contentType = 'image/png') {
  const slot = await request('POST', `${BASE}/files/generate-upload-url`, { content_type: contentType });
  if (slot.error || !slot.upload_url) throw new Error(`upload url failed: ${slot.error || 'no url'}`);

  const put = await fetch(slot.upload_url, { method: 'PUT', headers: slot.upload_headers, body: await readFile(file) });
  if (!put.ok) throw new Error(`upload failed: HTTP ${put.status}`);
  return slot.public_url;
}

async function loadLedger(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return {};
  }
}

// key identifies the generation within a run so a rerun finds its saved request.
export async function generate(model, input, { key, ledgerFile, pollMs = 5000, timeoutMs = 15 * 60 * 1000 }) {
  const ledger = await loadLedger(ledgerFile);
  let id = ledger[key]?.requestId;

  if (!id) {
    const submitted = await request('POST', `${BASE}/${model}`, input);
    if (submitted.error) throw new Error(`submit failed: ${submitted.error}`);
    id = submitted.request_id;
    if (!id) throw new Error('submit returned no request id');
    const fresh = await loadLedger(ledgerFile);
    fresh[key] = { requestId: id, model, submittedAt: new Date().toISOString() };
    await writeFile(ledgerFile, JSON.stringify(fresh, null, 2));
  }

  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const s = await request('GET', `${BASE}/requests/${id}/status`);
    if (s.error) throw new Error(`status failed for ${id}: ${s.error}`);

    if (s.status === 'completed') {
      const url = s.video?.url ?? s.images?.[0]?.url;
      if (!url) throw new Error(`request ${id} completed without an output url`);
      return { requestId: id, url };
    }
    if (s.status === 'nsfw') throw new Error(`request ${id} was rejected by moderation`);
    if (['failed', 'canceled', 'cancelled'].includes(s.status)) throw new Error(`request ${id} ended as ${s.status}`);

    await new Promise((r) => setTimeout(r, pollMs));
  }

  throw new Error(`request ${id} still running after ${timeoutMs / 60000} minutes; rerun to resume`);
}
