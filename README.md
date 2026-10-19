# Steer Hackathon 1.0 — Aaditya Barak (solo)

Two submissions, one repo.

| | Live (no login) | Walkthrough |
|---|---|---|
| **PS1 — Game dashboard** (pick any of the 5 games) | https://steer-play.duckdns.org/ | — |
| **PS1 — Myth Smash** (playable ad) | https://steer-play.duckdns.org/smash/ · GitHub Pages copy: https://addyb0t.github.io/steer-hackathon/ps1-playable/smash/ | https://www.loom.com/share/918b27ef3e4d4d0fa7cabb8cce6b82a4 |
| **PS1 — Myth Range** (3D version, Three.js) | https://steer-play.duckdns.org/range/ · GitHub Pages copy: https://addyb0t.github.io/steer-hackathon/ps1-playable/range/ | — |
| **PS2 — Receipts** (paper to Instagram) | https://steer-posts.duckdns.org/ | https://www.loom.com/share/3e3cb0d8b1964857bf5d61271d735b4a |

- PS1 details: [`ps1-playable/README.md`](ps1-playable/README.md)
- PS2 details: [`ps2-pipeline/README.md`](ps2-pipeline/README.md)
- PS2 finished posts, captions and source sheet: [`submission/ps2-step1-extension/`](submission/ps2-step1-extension/)

## Contributors and tools

| Who / what | What it contributed |
|---|---|
| Aaditya Barak | Sole human contributor: concept, product decisions, testing, review of every claim, Looms. |
| Cursor (AI coding agent, Claude models) | Wrote most of the code under my direction: games, pipeline, review app, deployment. |
| OpenRouter: `openai/gpt-4o-mini` | PS2: citation lookup and finding extraction from the paper text. |
| OpenRouter: `anthropic/claude-sonnet-5` | PS2: post copy, captions and reel script. |
| OpenRouter: `google/gemini-3.1-flash-image` | PS2: AI stills (the creator frames used for the reel, and the slide-1 topic photo on new runs). |
| Higgsfield: `bytedance/seedance-2.0/image-to-video` | PS2: the AI reel video and voice. The woman in the reel is AI-generated, not a real person. |
| pdf.js, satori, resvg, ffmpeg (ffmpeg-static) | PS2: reading PDFs, rendering slides, cropping paper quotes, editing the reel. |
| Three.js r170 (MIT, via jsDelivr CDN) | PS1: the 3D Myth Range game. All models, textures and sounds are made in code. |
| Vite, React, Tailwind, shadcn/ui | PS2 review web app. |
| Google Fonts / Fontsource: Gelasio, Inter (SIL OFL) | Fonts. |
| Research papers | All cited inline. PS1: [`ps1-playable/shared/facts.js`](ps1-playable/shared/facts.js). PS2: [`submission/ps2-step1-extension/sources.md`](submission/ps2-step1-extension/sources.md). |

All work was created during the hackathon. No paid stock assets were used.
