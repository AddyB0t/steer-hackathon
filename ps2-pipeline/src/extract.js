// Extract: findings out of the paper, each one tied to the sentence ids it came
// from.
//
// The model is asked to cite ids, but a model citing an id proves nothing on its
// own, so every claim is then checked against the text it cites. Any number in
// the claim must actually appear in one of the cited sentences. Claims that fail
// are kept but marked unverified, never silently dropped, so the doctor sees them
// flagged rather than not at all.

import { chat } from './llm.js';

const CHUNK = 110;

const SYSTEM = `You extract findings from medical research papers for a doctor-led metabolic health company.

You are given numbered sentences from one paper. Return findings that a general reader in India would care about: what was studied, in how many people, what changed, by how much, and what the authors concluded.

Prefer specific findings over general ones. "Mean weight loss was 17.3% at week 68" is useful; "weight loss was greater" is not. When a sentence contains numbers, the finding should carry those numbers.

Rules:
- Every finding MUST cite the sentence ids it came from, in "sourceIds".
- Copy numbers exactly as written in the source. Never round, convert or infer a number.
- If a number is not in the sentences you cite, do not state it.
- Do not add context, mechanism or implication that is not in the text.
- Skip funding statements, author affiliations, references and boilerplate.

Return JSON: {"findings":[{"claim":"...","detail":"...","sourceIds":["p1-s12"],"kind":"result|method|conclusion|limitation"}]}`;

// Pull comparable numeric tokens out of a string. Percentages, decimals and
// plain integers all normalise to the same shape so "17.3%" in a claim matches
// "17.3%" in the source even when the surrounding words differ.
// Digits glued to letters (HbA1c, GLP-1, STEP1) are names, not measurements.
export function numbersIn(text) {
  return (text.match(/(?<![A-Za-z\d.-])\d+(?:[.,]\d+)?(?![A-Za-z\d])/g) || []).map((n) => n.replace(',', '.'));
}

// Everything from the reference list onward is citations of other papers, which
// must never be presented as this paper's findings.
function bodySentences(sentences) {
  const cut = sentences.findIndex((s) => /(^|\s)(REFERENCES|References|Bibliography)(\s|$)/.test(s.text));
  return cut === -1 ? sentences : sentences.slice(0, cut);
}

function verify(finding, byId) {
  const cited = finding.sourceIds.map((id) => byId.get(id)).filter(Boolean);

  if (cited.length !== finding.sourceIds.length) {
    return { ok: false, reason: 'cites a sentence id that does not exist' };
  }

  const haystack = cited.map((s) => s.text).join(' ');
  const available = new Set(numbersIn(haystack));
  const claimed = numbersIn(`${finding.claim} ${finding.detail || ''}`);
  const missing = claimed.filter((n) => !available.has(n));

  if (missing.length) {
    return { ok: false, reason: `numbers not found in cited text: ${missing.join(', ')}` };
  }

  return { ok: true };
}

export async function extract(doc) {
  const byId = new Map(doc.sentences.map((s) => [s.id, s]));
  const findings = [];
  const body = bodySentences(doc.sentences);

  for (let i = 0; i < body.length; i += CHUNK) {
    const slice = body.slice(i, i + CHUNK);
    const numbered = slice.map((s) => `[${s.id}] ${s.text}`).join('\n');

    const result = await chat([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Sentences from the paper:\n\n${numbered}` },
    ]);

    for (const f of result.findings || []) {
      if (!f.claim || !Array.isArray(f.sourceIds) || !f.sourceIds.length) continue;
      const check = verify(f, byId);
      findings.push({
        ...f,
        verified: check.ok,
        verifyNote: check.reason || null,
        sources: f.sourceIds.map((id) => byId.get(id)).filter(Boolean),
      });
    }
  }

  return {
    findings,
    stats: {
      total: findings.length,
      verified: findings.filter((f) => f.verified).length,
      flagged: findings.filter((f) => !f.verified).length,
    },
  };
}
