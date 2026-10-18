import { chat } from './llm.js';

try {
  const r = await chat([{ role: 'user', content: 'Reply with the JSON object {"ok": true}' }]);
  console.log('OpenRouter OK:', JSON.stringify(r));
} catch (err) {
  console.error('OpenRouter failed:', err.message.slice(0, 200));
  process.exit(1);
}
