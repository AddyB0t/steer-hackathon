import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { makeContent } from './content.js';

const dir = process.argv[2];
const { findings } = JSON.parse(await readFile(path.join(dir, 'findings.json'), 'utf8'));

const t0 = Date.now();
const result = await makeContent(findings);
await writeFile(path.join(dir, 'content.json'), JSON.stringify(result, null, 2));

console.log(`content: ${result.attempts} attempt(s), ${result.problems.length} unresolved problem(s), ${((Date.now() - t0) / 1000).toFixed(1)}s`);
for (const p of result.problems) console.log(`  PROBLEM ${p.where}: ${p.issues.join('; ')}`);
console.log(`\nANGLE: ${result.plan.angle}\nWHY: ${result.plan.reasoning}\n`);
result.plan.carousel.slides.forEach((s, i) => console.log(`slide ${i + 1} [${(s.findingIds || []).join(',')}] ${s.headline} | ${s.body}`));
console.log(`\nSTATIC [${(result.plan.static.findingIds || []).join(',')}] ${result.plan.static.headline} | ${result.plan.static.sub}`);
result.plan.reel.scenes.forEach((s, i) => console.log(`reel ${i + 1} [${(s.findingIds || []).join(',')}] ON: ${s.onScreen} | VO: ${s.voiceover}\n   VISUAL: ${s.visual}`));
console.log(`\nCAPTION: ${result.plan.caption}\nHINGLISH: ${result.plan.captionHinglish}\n${result.plan.hashtags.join(' ')}`);
