// Citation: who wrote the paper, where and when, read off its first page. The
// DOI and year are only kept if they literally appear in the paper text, so a
// guessed reference can never reach a post.

import { chat } from './llm.js';

const SYSTEM = `You read the first page of a research paper and return its reference.
Return JSON: {"title":"...","firstAuthor":"surname only","journal":"full journal name","journalShort":"standard abbreviation","year":"YYYY","doi":"10.xxxx/... or empty"}
Copy exactly from the text. If something is not in the text, return an empty string for it.`;

export async function cite(doc) {
  const text = doc.sentences.slice(0, 60).map((s) => s.text).join(' ');
  const all = doc.sentences.map((s) => s.text).join(' ');
  const r = await chat([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: text.slice(0, 9000) },
  ]);

  const doi = r.doi && all.includes(r.doi) ? r.doi : '';
  const year = r.year && all.includes(r.year) ? r.year : '';
  const author = r.firstAuthor ? `${r.firstAuthor} et al.` : 'Unknown authors';
  const journal = r.journalShort || r.journal || '';
  const title = r.title || doc.title || 'Untitled paper';

  return {
    title,
    citation: [author, `${title}.`, journal && `${journal}.`, year && `${year}.`, doi && `doi:${doi}`].filter(Boolean).join(' '),
    short: [author, journal, year].filter(Boolean).join(', '),
    url: doi ? `https://doi.org/${doi}` : '',
  };
}
