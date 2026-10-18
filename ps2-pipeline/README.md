# PS2 — Receipts (research paper to Instagram)

**Try it:** https://steer-posts.duckdns.org/ (no login: upload any paper PDF)
**Walkthrough:** https://www.loom.com/share/3e3cb0d8b1964857bf5d61271d735b4a
**Finished posts, captions and source sheet:** [`../submission/ps2-step1-extension/`](../submission/ps2-step1-extension/)

Upload a paper and get a carousel, a static post, English and Hinglish captions, a reel script and an optional AI reel, in Steer's voice. Every published line keeps a "receipt": the exact sentence and page in the paper it came from.

## The 3 finished posts

From the STEP 1 trial extension (Wilding et al., Diabetes Obes Metab, 2022, https://doi.org/10.1111/dom.14725):

- **Carousel:** `posts/carousel-01.png` to `carousel-06.png`
- **Static:** `posts/static.png`
- **Reel:** `posts/reel.mp4` (32 s, AI creator, with the real paper crop on screen for each quoted line)
- **Research and source sheet:** `sources.md` maps every line to its sentence and page
- **Captions:** `captions.md`

## How it works

| Stage | What happens | Tool |
|---|---|---|
| Ingest | Read the PDF into numbered sentences per page | pdf.js |
| Cite | Find the reference. The DOI and year are kept only if they are printed in the paper | gpt-4o-mini |
| Extract | Pull findings, each tied to sentence IDs. A finding is dropped if any of its numbers is missing from the cited sentence | gpt-4o-mini + code check |
| Content | Write the carousel, static, captions and reel plan in Steer's voice. Banned list: drug and brand names, kilo or timeline promises, before/after, miracle words | Claude Sonnet + code check |
| Render | Brand slides (Steer colours, Gelasio and Inter) | satori + resvg |
| Reel script | 6 lines. Quoted lines must match the paper word for word, or the script is rewritten (3 tries) | Claude Sonnet + code check |
| Crops | Crop the quoted sentence from the PDF page, shown on screen in the reel | pdf.js + canvas |
| Reel (optional) | AI creator video from 2 stills, then captions and crops overlaid | Seedance 2.0 via Higgsfield, ffmpeg |
| Review | Web app: every line next to its source sentence, numbers re-checked, lines with no source flagged for a human | React app |
| Publish | Export the approved posts with sources | server |

## Human time per paper (estimate)

| Step | Time |
|---|---|
| Upload PDF | under 1 min |
| Pipeline runs (no reel) | about 3.5 min, no human needed (measured: 210 s for a 13-page paper) |
| AI reel (optional) | about 5–10 min extra, no human needed |
| Doctor or editor review of flagged lines, then approve | about 10–15 min |
| **Total human time** | **about 15 minutes per paper** |

Cost per paper: a few US cents of OpenRouter calls without a reel, plus about $0.07 for the slide-1 photo. An AI reel costs about $3 extra in Higgsfield credits. Reels are turned off on the public demo server.

## Run locally

```bash
cd ps2-pipeline
npm install
cp .env.example .env          # add OPENROUTER_API_KEY
# optional, for reels: put HF_CREDENTIALS in .env.local
cd review-ui && npm install && npm run build && cd ..
npm start                     # http://localhost:4321
```

Node 20+. Set `APP_PASSWORD` to put the app behind a password on a public server.

## Files

- `src/pipeline.js` — the stages and job runner
- `src/ingest.js`, `src/cite.js`, `src/extract.js`, `src/content.js`, `src/render.js` — pipeline stages
- `src/reel-script.js`, `src/reel-ugc.js`, `src/paper-crop.js` — reel script, crops, reel edit
- `src/review.js`, `src/server.js` — review data, API and web server
- `review-ui/` — the review web app (Vite + React)
- `assets/creator/` — the AI-generated creator stills used for reels
