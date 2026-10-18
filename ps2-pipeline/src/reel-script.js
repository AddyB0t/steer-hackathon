// Reel script: six lines for the talking-to-camera creator, written from the
// verified findings. Factual lines must quote their source sentence word for
// word, and that is checked in code, so a bad quote is sent back to the model
// rather than shipped.

import { chat } from './llm.js';
import { checkQuotes } from './reel-ugc.js';
import { numbersIn } from './extract.js';
import { tidy } from './content.js';

const SYSTEM = `You write a 30-second talking-to-camera Instagram reel for steer, India's doctor-led metabolic health club. One Indian woman speaks to her phone camera in her kitchen. Calm, warm, honest. No fear, no hype, no promises, never name a drug or brand. Never tell or imply anyone should stop a medicine: say "coming off", never "stop" or "quit", and never say "jab".

Write exactly 6 short lines, in this order:
1. hook: the reader's real worry, as a question. No source.
2. source: names the study plainly with its year and journal, e.g. "A 2022 trial in Diabetes, Obesity and Metabolism tracked exactly this." Cites one sentence.
3. number: the key finding with its number. Cites one sentence.
4. twist: the second finding, ideally quoting the paper's own words. Cites one sentence.
5. hope: a balancing, honest finding. Cites one sentence.
6. ask: a soft handoff ending with "Ask a doctor." No source.

For lines 2-5:
- "sourceId" is one sentence id from the list.
- "quote" is copied WORD FOR WORD from that sentence (4-15 words, keep punctuation and numbers exactly). To skip words in the middle, use " … " between two exact pieces.
- Every number in "caption" must appear in that sentence.

Each line: "say" is what she speaks, with numbers spelled out ("seventeen point three percent"); "caption" is the on-screen text with digits ("17.3%"), max 14 words; "emotion" is one or two words; "beat" is one small facial or head movement (no hands).

Return JSON: {"lines":[{"say":"...","caption":"...","emotion":"...","beat":"...","sourceId":"p2-s4","quote":"..."}]}  (omit sourceId and quote on lines 1 and 6)`;

function toScript(lines) {
  const part = (key, from, to, ls) => ({ key, seconds: 15, from, to, lines: ls });
  return [part('part-a', 'start.png', 'mid.png', lines.slice(0, 3)), part('part-b', 'mid.png', 'end.png', lines.slice(3, 6))];
}

function audit(script, findings) {
  const problems = checkQuotes(findings, script);
  const sentences = new Map(findings.flatMap((f) => f.sources.map((s) => [s.id, s.text])));
  const lines = script.flatMap((p) => p.lines);
  if (lines.length !== 6) problems.push(`need exactly 6 lines, got ${lines.length}`);
  lines.forEach((l, i) => {
    if (i >= 1 && i <= 4 && !l.sourceId) problems.push(`line ${i + 1} must cite a sourceId`);
    if (l.sourceId) {
      const have = new Set(numbersIn(sentences.get(l.sourceId) || ''));
      const missing = numbersIn(l.caption).filter((n) => !have.has(n));
      if (missing.length) problems.push(`line ${i + 1} caption numbers not in ${l.sourceId}: ${missing.join(', ')}`);
    }
  });
  return problems;
}

export async function makeReelScript(findings, paper, { attempts = 3 } = {}) {
  const sentences = [...new Map(findings.filter((f) => f.verified).flatMap((f) => f.sources.map((s) => [s.id, s]))).values()];
  const list = sentences.map((s) => `${s.id}: ${s.text}`).join('\n');
  const study = `Study: ${paper.citation}`;

  let feedback = '';
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const { lines = [] } = tidy(
      await chat(
        [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `${study}\n\nSentences:\n${list}${feedback}` },
        ],
        { temperature: 0.5, model: process.env.CONTENT_MODEL || 'anthropic/claude-sonnet-5' },
      ),
    );
    const script = toScript(lines);
    const problems = audit(script, findings);
    if (!problems.length) return { script, attempts: attempt };
    feedback = `\n\nYour previous script broke the rules. Fix these and return the full JSON again:\n${problems.map((p) => `- ${p}`).join('\n')}`;
    if (attempt === attempts) throw new Error(`reel script failed checks: ${problems.join('; ')}`);
  }
}
