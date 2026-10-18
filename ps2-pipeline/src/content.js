// Content: verified findings in, a carousel, a static, a reel script and a
// caption out, in Steer's voice.
//
// Every slide and scene cites finding ids, and the same number check used in
// extract runs again on the finished copy. A rewrite that drifts ("nearly 70%"
// for "two-thirds", "12%" for "11.6 percentage points") is caught here, before a
// doctor ever has to spot it.

import { readFile } from 'node:fs/promises';
import { chat } from './llm.js';
import { numbersIn } from './extract.js';

const brand = JSON.parse(await readFile(new URL('../../brand.json', import.meta.url), 'utf8'));

const BANNED = [
  /\bozempic\b/i, /\bwegovy\b/i, /\bmounjaro\b/i, /\bzepbound\b/i, /\bsemaglutide\b/i, /\btirzepatide\b/i,
  /\blose \d+\s?(kg|kilos?)\b/i, /\bin \d+\s?(days|weeks)\b/i, /\bguarantee/i, /\bmiracle\b/i,
  /\bbefore[- ]and[- ]after\b/i, /\bbefore\/after\b/i,
];

const SYSTEM = `You write Instagram content for steer, India's doctor-led metabolic health club.

Audience: ${brand.audience}

Voice: ${brand.voice.register}
Pillars: ${brand.voice.pillars.join(' ')}
Sample lines: ${brand.voice.sampleLines.join(' | ')}
Made for India: rotis, chai, weddings, desk jobs, family dinners, 3pm crashes.

Hard rules:
- Use ONLY the findings provided. Every slide, line and scene cites the finding ids it relies on in "findingIds".
- Copy numbers exactly as they appear in the findings. Never round or rephrase a number ("two-thirds" stays "two-thirds", "11.6 percentage points" stays as is).
- Never name a drug or brand. Say "GLP-1 medicine" instead.
- No weight-loss promises, no kilos, no timelines, no before/after, no fear, no shame, no hype.
- Sentence case. Short lines. Lots of white space. Max 22 words per slide body.
- Never use em dashes or en dashes. Use a comma or a full stop instead.
- Name the real worry and answer it honestly, then point to the doctor-led, planned-exit approach.
- Never claim or imply that a plan, programme or habit prevents or reduces an outcome unless a finding says so. Lines without findingIds make no factual claims: only questions and next steps.
- When a number is an average, say "on average". Never turn a group result into a promise for the reader.

Return JSON:
{
  "angle": "one sentence: the single message all three posts convey",
  "reasoning": "2-3 sentences: why this message matters to this audience",
  "carousel": {"slides": [{"headline": "...", "italic": "optional word or phrase from the headline to set in italic", "body": "...", "findingIds": ["f1"]}]},
  "static": {"headline": "...", "italic": "...", "sub": "...", "findingIds": ["f1"]},
  "reel": {"durationSec": 15, "scenes": [{"seconds": 5, "visual": "cinematic shot description, Indian setting, no bodies being judged, no medicine", "onScreen": "max 8 words", "voiceover": "...", "findingIds": ["f1"]}]},
  "caption": "...",
  "captionHinglish": "...",
  "hashtags": ["#..."]
}

Angle: one specific, honest message drawn from the findings. Not "understand your journey". Something a person would repeat to a friend.

Carousel: 6 slides. Slide 1 is the hook: the real worry, in the reader's own words. Slides 2-4 each carry one finding with its number. Slide 5 turns the finding into a question or next step for the reader (for example, ask about life after the medicine before starting), with no new facts. Slide 6 is a soft handoff ("Stop Googling. Ask a doctor." style). Only slides 5 and 6 may have empty findingIds.

Static: one image, one idea. The headline carries the single strongest number from the findings. Must cite findingIds.

Reel: 3 scenes of 5 seconds. Scene 1 hooks with the worry, scene 2 states the key finding with its number, scene 3 gives the takeaway and the handoff. Scenes 1 and 2 must cite findingIds. Visual descriptions are for an AI video model: real Indian everyday settings (kitchen, office desk, chai, family table), warm light, no doctors in white coats holding syringes, no bodies, no scales, no medicine.

Caption: 3-5 short lines, ends with "Source:" and the paper reference in plain words, then "steerclub.com".

captionHinglish: Roman script, the way people in Indian cities actually text, mixing everyday Hindi and English ("Dawai ke baad weight wapas aata hai?"). Not formal or Sanskritised Hindi.

Hashtags: 6-8, mix of broad and India-specific.`;

function checkText(text, findingIds, byId) {
  const issues = [];
  for (const re of BANNED) if (re.test(text)) issues.push(`banned phrase: ${re.source}`);

  const known = findingIds.map((id) => byId.get(id));
  if (known.some((f) => !f)) issues.push('cites an unknown finding id');

  const sourceText = known.filter(Boolean).flatMap((f) => [f.claim, f.detail || '', ...f.sources.map((s) => s.text)]).join(' ');
  const available = new Set(numbersIn(sourceText));
  const missing = numbersIn(text).filter((n) => !available.has(n));
  if (missing.length) issues.push(`numbers not in cited findings: ${missing.join(', ')}`);

  return issues;
}

function audit(plan, byId) {
  const items = [
    ...plan.carousel.slides.map((s, i) => ({ where: `carousel slide ${i + 1}`, text: `${s.headline} ${s.body}`, ids: s.findingIds || [] })),
    { where: 'static', text: `${plan.static.headline} ${plan.static.sub}`, ids: plan.static.findingIds || [] },
    ...plan.reel.scenes.map((s, i) => ({ where: `reel scene ${i + 1}`, text: `${s.onScreen} ${s.voiceover}`, ids: s.findingIds || [] })),
  ];

  const allIds = items.flatMap((i) => i.ids);
  items.push({ where: 'caption', text: plan.caption.split(/source:/i)[0], ids: allIds });

  return items.map((i) => ({ where: i.where, issues: checkText(i.text, i.ids, byId) })).filter((r) => r.issues.length);
}

// Models still slip em dashes in despite the rule; they read as machine-written.
export function tidy(value) {
  if (typeof value === 'string') return value.replace(/\s*[—–]\s*/g, ', ').replace(/,\s*([.?!])/g, '$1');
  if (Array.isArray(value)) return value.map(tidy);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, tidy(v)]));
  return value;
}

export async function makeContent(findings, { attempts = 3 } = {}) {
  const usable = findings.filter((f) => f.verified).map((f, i) => ({ ...f, id: `f${i + 1}` }));
  const byId = new Map(usable.map((f) => [f.id, f]));
  const list = usable.map((f) => `${f.id}: ${f.claim}${f.detail ? ` (${f.detail})` : ''}`).join('\n');

  let feedback = '';
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const plan = tidy(
      await chat(
        [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Findings:\n${list}${feedback}` },
        ],
        { temperature: 0.6, model: process.env.CONTENT_MODEL || 'anthropic/claude-sonnet-5' },
      ),
    );

    const problems = audit(plan, byId);
    if (!problems.length) return { plan, findings: usable, problems: [], attempts: attempt };

    feedback = `\n\nYour previous draft broke the rules. Fix these and return the full JSON again:\n${problems
      .map((p) => `- ${p.where}: ${p.issues.join('; ')}`)
      .join('\n')}`;

    if (attempt === attempts) return { plan, findings: usable, problems, attempts: attempt };
  }
}
