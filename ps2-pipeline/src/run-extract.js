import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ingest } from './ingest.js';
import { extract } from './extract.js';

const source = process.argv[2];
if (!source) {
  console.error('Usage: node src/run-extract.js <pdf path or url>');
  process.exit(1);
}

const slug = path.basename(source).replace(/\.pdf$/i, '');
const outDir = path.join('out', slug);
await mkdir(outDir, { recursive: true });

const doc = await ingest(source);
await writeFile(path.join(outDir, 'doc.json'), JSON.stringify(doc, null, 2));
console.log(`ingest: ${doc.pageCount} pages, ${doc.sentences.length} sentences`);

const t0 = Date.now();
const result = await extract(doc);
await writeFile(path.join(outDir, 'findings.json'), JSON.stringify(result, null, 2));
console.log(`extract: ${result.stats.total} findings, ${result.stats.verified} verified, ${result.stats.flagged} flagged (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

for (const f of result.findings) {
  console.log(`${f.verified ? 'OK  ' : 'FLAG'} [${f.sourceIds.join(',')}] ${f.claim}${f.verifyNote ? `  <- ${f.verifyNote}` : ''}`);
}
