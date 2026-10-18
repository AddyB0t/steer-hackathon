// Stills: start and end frames for the reel, generated on OpenRouter.
//
// The end frame is generated with the start frame as a reference image, so the
// same person, wardrobe and room carry through. Seedance then only has to
// animate between two approved frames instead of inventing a person per shot,
// which is what made the first reel look like three unrelated stock clips.

import { readFile, writeFile } from 'node:fs/promises';
import 'dotenv/config';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.STILLS_MODEL || 'google/gemini-3.1-flash-image';

// Slide 1 photo. Kept generic and safe: a person and a setting that fit the
// topic, never a drug, needle, pack, chart or any text the paper did not say.
export function coverPhotoPrompt(plan) {
  return `Editorial lifestyle photograph for an Instagram health post. Topic: ${plan.angle}
Hook on the slide: "${plan.carousel.slides[0]?.headline || ''}".
Show one Indian adult in a real, everyday Indian home or neighbourhood setting that fits this topic, in a calm, thoughtful moment. Natural window light, warm and honest, shot on a phone, shallow depth of field, candid, not posed stock.
The photo fills the whole frame edge to edge, with no borders, bands or empty strips.
No text, no letters, no logos, no medicine packs, no pills, no needles or pens, no charts, no hospital.`;
}

export async function generateStill(prompt, outFile, { references = [], aspectRatio = '9:16' } = {}) {
  const refParts = await Promise.all(
    references.map(async (file) => ({
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${(await readFile(file)).toString('base64')}` },
    })),
  );

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        modalities: ['image', 'text'],
        image_config: { aspect_ratio: aspectRatio },
        messages: [{ role: 'user', content: [...refParts, { type: 'text', text: prompt }] }],
      }),
    });

    if (!res.ok) {
      if (attempt === 3) throw new Error(`OpenRouter image ${res.status}: ${(await res.text()).slice(0, 200)}`);
      continue;
    }

    const data = await res.json();
    const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (url?.startsWith('data:')) {
      await writeFile(outFile, Buffer.from(url.split(',')[1], 'base64'));
      return { file: outFile, cost: data.usage?.cost ?? null };
    }
    if (attempt === 3) throw new Error('OpenRouter returned no image');
  }
}
