// Shared ending for every game: what you learned (cited), what worries you,
// a readout built from those worries, then a soft handoff. The lead that
// reaches Steer carries the worries and game result, so the first call can be
// about the person instead of the basics.

import { FACTS, STEER } from './facts.js';

const DOUBTS = [
  { id: 'safety', label: 'Is it safe? Side effects?', facts: ['sideEffects'], steer: 'safety' },
  { id: 'muscle', label: 'Will I lose muscle?', facts: ['leanMass', 'protein'], steer: 'muscle' },
  { id: 'regain', label: 'Will the weight come back?', facts: ['ghrelin', 'regain'], steer: 'regain' },
  { id: 'diabetes', label: 'Is it only for diabetics?', facts: ['notOnlyDiabetes'], steer: 'forMe' },
  { id: 'forMe', label: 'Is it even for me?', facts: ['asianBmi'], steer: 'forMe' },
];
const FOOD = [
  { id: 'veg', label: 'Veg', protein: 'dal, paneer, curd, chana, rajma, soya' },
  { id: 'egg', label: 'Veg + eggs', protein: 'eggs, paneer, dal, curd, chana' },
  { id: 'nonveg', label: 'Non-veg', protein: 'eggs, chicken, fish, dal, curd' },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function factHtml(key, delay = 0) {
  const f = FACTS[key];
  return `<div class="fact rise" style="animation-delay:${delay}ms"><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p><a class="source" href="${f.url}" target="_blank" rel="noopener">${esc(f.source)}</a></div>`;
}

function screen(stage, html, cls = '') {
  stage.querySelectorAll('.end-screen').forEach((s) => s.remove());
  const el = document.createElement('section');
  el.className = `screen end-screen ${cls}`;
  el.innerHTML = html;
  stage.appendChild(el);
  el.scrollTop = 0;
  return el;
}

/**
 * game: short id for the lead. result: { headline, line, lessons: [factKeys] }.
 * onReplay: called when the player wants another go.
 * doubts: doubt ids to pre-pick (from how they played). skipLessons: go straight to doubts.
 * extra: more context for the lead, e.g. which claims they got wrong.
 */
export function showEnd(stage, { game, result, onReplay, doubts: preset = [], skipLessons = false, extra = {} }) {
  const src = new URLSearchParams(location.search).get('src') || 'website';
  const lead = { game, src, result: result.line, doubts: [...preset], food: null, ...extra };
  try {
    const played = JSON.parse(localStorage.getItem('steer-played') || '{}');
    played[game] = { line: result.line, at: Date.now() };
    localStorage.setItem('steer-played', JSON.stringify(played));
  } catch { /* private mode: the hub just won't show ticks */ }

  const lessons = () => {
    const el = screen(stage, `
      <div class="brand">steer</div>
      <div class="spacer" style="max-height:20px"></div>
      <div class="eyebrow">Your result</div>
      <h2 class="pop" style="margin-top:6px">${result.headline}</h2>
      <p class="muted" style="margin-top:8px">${esc(result.line)}</p>
      <div class="stack" style="margin-top:20px">
        <div class="eyebrow">What just happened, in real life</div>
        ${result.lessons.map((k, i) => factHtml(k, 120 * i)).join('')}
      </div>
      <div class="spacer"></div>
      <div class="stack" style="margin-top:20px">
        <button class="btn" data-next>Make it about me →</button>
        <button class="btn ghost" data-replay>Play again</button>
        <p class="disclaimer">A game, not a medical test. Real numbers need a real doctor.</p>
      </div>`);
    el.querySelector('[data-next]').onclick = doubts;
    el.querySelector('[data-replay]').onclick = () => {
      el.remove();
      onReplay();
    };
  };

  const doubts = () => {
    const el = screen(stage, `
      <div class="brand">steer</div>
      <div class="spacer" style="max-height:24px"></div>
      <div class="eyebrow">2 quick taps</div>
      <h2 style="margin-top:6px">What's <em>really</em> on your mind?</h2>
      <p class="muted" style="margin-top:6px">${preset.length ? 'We pre-picked the ones your game says to look at. Change anything.' : 'Pick any. Most people pick two.'}</p>
      <div class="chips" style="margin-top:16px" data-doubts>
        ${DOUBTS.map((d) => `<button class="chip${lead.doubts.includes(d.id) ? ' on' : ''}" data-id="${d.id}">${esc(d.label)}</button>`).join('')}
      </div>
      <h3 style="margin-top:26px">What's on your plate?</h3>
      <div class="chips" style="margin-top:12px" data-food>
        ${FOOD.map((f) => `<button class="chip" data-id="${f.id}">${esc(f.label)}</button>`).join('')}
      </div>
      <div class="spacer"></div>
      <button class="btn" data-next disabled style="margin-top:20px">Show my readout</button>`);
    const next = el.querySelector('[data-next]');
    const sync = () => (next.disabled = !(lead.doubts.length && lead.food));
    el.querySelectorAll('[data-doubts] .chip').forEach((c) =>
      (c.onclick = () => {
        c.classList.toggle('on');
        lead.doubts = [...el.querySelectorAll('[data-doubts] .chip.on')].map((x) => x.dataset.id);
        sync();
      }),
    );
    el.querySelectorAll('[data-food] .chip').forEach((c) =>
      (c.onclick = () => {
        el.querySelectorAll('[data-food] .chip').forEach((x) => x.classList.remove('on'));
        c.classList.add('on');
        lead.food = c.dataset.id;
        sync();
      }),
    );
    next.onclick = readout;
  };

  const readout = () => {
    const food = FOOD.find((f) => f.id === lead.food);
    const picked = DOUBTS.filter((d) => lead.doubts.includes(d.id));
    const factKeys = [...new Set(picked.flatMap((d) => d.facts))];
    const steerKeys = [...new Set(picked.map((d) => d.steer))];
    const el = screen(stage, `
      <div class="brand">steer</div>
      <div class="spacer" style="max-height:20px"></div>
      <div class="eyebrow">Your readout</div>
      <h2 style="margin-top:6px">What matters most <em>for someone like you.</em></h2>
      <div class="stack" style="margin-top:18px">
        ${factKeys.map((k, i) => factHtml(k, 100 * i)).join('')}
        <div class="card rise" style="animation-delay:${100 * factKeys.length}ms">
          <div class="eyebrow">Your protein, your plate</div>
          <p style="margin-top:6px">Easy wins for a ${esc(food.label.toLowerCase())} kitchen: <b>${esc(food.protein)}</b>.</p>
        </div>
        <div class="card rise" style="animation-delay:${100 * factKeys.length + 100}ms;background:#fff">
          <div class="eyebrow">How Steer handles it</div>
          <ul style="margin:8px 0 0;padding-left:18px;line-height:1.5">${steerKeys.map((k) => `<li>${esc(STEER[k])}</li>`).join('')}<li>${esc(STEER.daily)}</li></ul>
        </div>
      </div>
      <div class="spacer"></div>
      <div class="stack" style="margin-top:20px">
        <button class="btn" data-next>Talk to a Steer doctor</button>
        <p class="disclaimer">"Before you start, hear it from a doctor, not a reel."</p>
      </div>`);
    el.querySelector('[data-next]').onclick = handoff;
  };

  const handoff = () => {
    const el = screen(stage, `
      <div class="brand">steer</div>
      <div class="spacer" style="max-height:24px"></div>
      <h2>See if the programme <em>fits you.</em></h2>
      <p class="muted" style="margin-top:8px">A Steer doctor calls you. No obligation: if it isn't right for you, they'll say so.</p>
      <form class="stack" style="margin-top:20px" data-form>
        <input class="field" name="name" placeholder="Your name" autocomplete="name" required maxlength="60">
        <input class="field" name="phone" placeholder="WhatsApp number" inputmode="tel" autocomplete="tel" required pattern="[0-9+ ]{10,15}">
        <input class="field" name="city" placeholder="City (optional)" maxlength="40">
        <button class="btn" type="submit">Book my doctor call</button>
      </form>
      <div class="spacer"></div>
      <p class="disclaimer" style="margin-top:16px">We only use this to call you about Steer.</p>`);
    el.querySelector('[data-form]').onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      const payload = { ...lead, ...data, at: new Date().toISOString() };
      let sent = false;
      try {
        const r = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        sent = r.ok;
      } catch {}
      done(payload, sent);
    };
  };

  const done = (p, sent) => {
    const picked = DOUBTS.filter((d) => p.doubts.includes(d.id)).map((d) => d.label);
    screen(stage, `
      <div class="brand">steer</div>
      <div class="spacer" style="max-height:24px"></div>
      <h2 class="pop">Done, ${esc(p.name.split(' ')[0])}.</h2>
      <p style="margin-top:8px">${sent ? 'A Steer doctor will call you on WhatsApp.' : 'Demo mode: nothing was sent. On the live ad, a Steer doctor would call you on WhatsApp.'}</p>
      <div class="card rise" style="margin-top:20px;background:#fff">
        <div class="eyebrow">What your doctor sees before the call</div>
        <ul style="margin:10px 0 0;padding-left:18px;line-height:1.6">
          <li><b>Worries:</b> ${esc(picked.join(', '))}</li>
          <li><b>Food:</b> ${esc(FOOD.find((f) => f.id === p.food).label)}</li>
          <li><b>Game:</b> ${esc(p.result)}</li>
          ${p.wrong && p.wrong.length ? `<li><b>Mixed up:</b> ${esc(p.wrong.join('; '))}</li>` : ''}
        </ul>
        <p class="muted small" style="margin-top:10px">So the first call is about your health, not the basics.</p>
      </div>
      <div class="spacer"></div>
      <a class="btn ghost" href="../" style="margin-top:20px;text-decoration:none">Try another game</a>`);
  };

  skipLessons ? doubts() : lessons();
}

export function toast(stage, text, ms = 1400) {
  let t = stage.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    stage.appendChild(t);
  }
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), ms);
}
