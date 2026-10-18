// Review items: every line that will be published, next to the paper sentence
// it came from. Lines with no source are the ones a doctor actually has to
// think about, so they are flagged rather than hidden. Numbers are re-checked
// here against the cited sentences, because the doctor should not have to
// trust the pipeline.

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { numbersIn } from './extract.js';
import { checkQuotes } from './reel-ugc.js';

const load = async (file) => JSON.parse(await readFile(file, 'utf8'));

// The model writes the caption, but never the citation: that comes from paper.json.
export function finalCaption(caption, paper) {
  const body = caption.split('\n').filter((l) => !/^\s*source\s*:/i.test(l) && !/steerclub\.com/i.test(l));
  return [...body, `Source: ${paper.short}.${paper.url ? ` ${paper.url}` : ''}`, 'steerclub.com'].join('\n');
}

export async function buildItems(dir) {
  const paper = await load(path.join(dir, 'paper.json'));
  const content = await load(path.join(dir, 'content.json'));
  const scriptFile = path.join(dir, 'reel-v2', 'script.json');
  const script = existsSync(scriptFile) ? await load(scriptFile) : [];
  const { plan } = content;

  const byFinding = new Map(content.findings.map((f) => [f.id, f]));
  const bySentence = new Map(content.findings.flatMap((f) => f.sources.map((s) => [s.id, s])));
  checkQuotes(content.findings, script);

  const numberCheck = (text, sources) => {
    const have = new Set(numbersIn([...sources.map((s) => s.text), paper.citation].join(' ')));
    return numbersIn(text).map((n) => ({ n, ok: have.has(n) }));
  };

  const items = [];
  const add = (post, where, text, sources, image) =>
    items.push({ id: `${post}:${where}`, post, where, text, sources, image, editorial: sources.length === 0, numbers: numberCheck(text, sources) });
  const fromFindings = (ids = []) => [...new Map(ids.flatMap((id) => byFinding.get(id)?.sources || []).map((s) => [s.id, s])).values()];

  plan.carousel.slides.forEach((s, i) =>
    add('Carousel', `slide ${i + 1}`, [s.headline, s.body].filter(Boolean).join('\n'), fromFindings(s.findingIds), `posts/carousel-${String(i + 1).padStart(2, '0')}.png`),
  );
  add('Static', 'post', [plan.static.headline, plan.static.sub].filter(Boolean).join('\n'), fromFindings(plan.static.findingIds), 'posts/static.png');
  script.forEach((part) =>
    part.lines.forEach((l, j) =>
      add('Reel', `${part.key} line ${j + 1}`, l.caption, l.sourceId ? [bySentence.get(l.sourceId)].filter(Boolean) : [], l.quote ? `reel-v2/${part.key}-${j + 1}-paper.png` : null),
    ),
  );
  add('Caption', 'English', finalCaption(plan.caption, paper), [], null);
  add('Caption', 'Hinglish', finalCaption(plan.captionHinglish, paper), [], null);

  return { paper, content, items, hasReel: existsSync(path.join(dir, 'posts', 'reel.mp4')) };
}
