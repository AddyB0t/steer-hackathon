# PS1 — Myth Smash (playable ad)

**Play:** https://steer-play.duckdns.org/smash/ (add `?src=ig` to tag Instagram traffic)
**GitHub Pages copy:** https://addyb0t.github.io/steer-hackathon/ps1-playable/smash/ (lead form runs in demo mode here, because Pages has no server)
**Walkthrough:** https://www.loom.com/share/918b27ef3e4d4d0fa7cabb8cce6b82a4

## The three answers

- **Trigger:** a "family WhatsApp" myth ("Crunches melt tummy fat") floats on screen in the first second. There is no rules screen and no button. The first swipe is the tutorial and starts the game.
- **Value:** 45 seconds of slash-the-myth, spare-the-fact. Every card maps to one of the 5 doubts in the brief (Is it safe? Will I lose muscle? Will the weight come back? Is it only for diabetics? Is it for me?). It ends with a doubt report: each doubt is "Cleared" or "Worth a chat", and every card opens its study.
- **Next step:** "Talk to a Steer doctor". The doubts the player got wrong are pre-picked, so the lead arrives warm: worries, food type (veg, egg or non-veg) and which myths they believed.

## Myth Range (3D)

https://steer-play.duckdns.org/range/

The same cards, doubt report and doctor handoff as Myth Smash, played as a first-person 3D shooter on a walkable map (a sunset training yard with buildings, cover walls and crates). Myth and fact boards pop up around the map; a radar shows where they are. Desktop: WASD, mouse look (pointer lock), click to shoot, Shift to run, Space to jump, R to reload. Phone: left-thumb joystick, right-thumb look, fire button with light aim assist. Myths shatter, facts cost a life. 90 seconds, 12-round magazine, streak multiplier, accuracy on the report. The targets are cardboard boards, never people.

- Built with [Three.js](https://threejs.org) r170 (MIT), loaded from the jsDelivr CDN. Every model, texture and sound is made in code: no downloaded assets.
- Needs WebGL. If WebGL is missing, the page links to Myth Smash instead.

## Target device and browser

- Mobile first: tested at 390 × 844 (iPhone 12–15 size) in Chromium mobile emulation. Works on desktop too, in a centred phone-width frame.
- Any modern browser with ES modules and Canvas: Chrome/Edge 90+, Safari 15+, Firefox 90+.
- No login. No build step. Plain HTML, CSS and JavaScript. Total page weight is small (one HTML file, shared CSS/JS, Google Fonts).

## Completion status

| Part | Status |
|---|---|
| Myth Smash game, report, doctor handoff | Done, tested end to end |
| Lead capture (`POST /api/leads` to `leads.jsonl`) | Done on the live server. Demo mode on GitHub Pages |
| Myth Range (3D first-person version of Myth Smash, Three.js) | Done: https://steer-play.duckdns.org/range/ |
| Build Your Thali (bonus game: lunch to 4 pm hunger sim, 3 levels) | Done: https://steer-play.duckdns.org/thali/ |
| Shaadi Buffet, Hunger Tug (early prototypes) | Prototypes only, not part of the submission |
| Real Meta deployment | Not done (optional in the brief) |

## Accuracy

Every claim on screen comes from one file, [`shared/facts.js`](shared/facts.js). Each fact has its text, its study and a DOI link, and games only reference facts by key, so nothing can drift from its source. Steer's own process (diagnostics first, DEXA, daily WhatsApp care team) is kept separate in `STEER` and is shown as "How Steer handles it", never as a study.

No drug or brand names, no before/after, no weight-loss promises. Thali's hunger times come from a simple illustrative model, and the game says so on screen.

## Run locally

```bash
cd ps1-playable
node serve.js          # http://localhost:4400
```

Node 18+. No dependencies.

## Files

- `smash/index.html` — Myth Smash
- `range/index.html` — Myth Range (3D)
- `thali/index.html` — Build Your Thali
- `shared/claims.js` — the myth/fact cards both myth games use
- `shared/facts.js` — every cited fact
- `shared/end.js` — shared ending: doubts, readout, lead form, "what your doctor sees"
- `shared/steer.css` — Steer brand styles
- `serve.js` — static server and lead endpoint
