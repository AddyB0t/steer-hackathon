// Thin OpenRouter client. Retries on transient failures and forces JSON back,
// because every downstream stage parses structured output rather than prose.

import 'dotenv/config';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// Not every provider honours response_format, so tolerate code fences and
// leading prose around the JSON object.
function parseJson(content) {
  const unfenced = content.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('Model did not return JSON');
    return JSON.parse(unfenced.slice(start, end + 1));
  }
}

export async function chat(messages, { json = true, temperature = 0.3, model } = {}) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is missing. Put it in .env');

  const body = {
    model: model || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
    messages,
    temperature,
    ...(json ? { response_format: { type: 'json_object' } } : {}),
  };

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://steerclub.com',
          'X-Title': 'Steer paper-to-post pipeline',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty completion');

      return json ? parseJson(content) : content;
    } catch (err) {
      lastError = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }

  throw lastError;
}
