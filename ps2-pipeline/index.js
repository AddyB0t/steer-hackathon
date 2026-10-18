import dotenv from 'dotenv';
import { config, higgsfield } from '@higgsfield/client/v2';

dotenv.config({ path: '.env.local', quiet: true });

if (!process.env.HF_CREDENTIALS) {
  console.error('HF_CREDENTIALS is not set. Add it to .env.local as key-id:key-secret.');
  process.exit(1);
}

config({ credentials: process.env.HF_CREDENTIALS });

const result = await higgsfield.subscribe('bytedance/seedance-2.5/text-to-video', {
  input: {
    prompt: 'A cinematic scene at sunset',
    duration: 5,
    resolution: '720p',
    aspect_ratio: '16:9',
  },
  withPolling: true,
});

// The SDK may return the raw response or wrap it in a JobSet.
const job = result.jobs?.[0];
const status = result.status ?? job?.status;
const url = result.video?.url ?? job?.results?.raw?.url;

if (result.isNsfw || status === 'nsfw') {
  console.error('Request was rejected by moderation.');
  process.exit(1);
}
if (result.isFailed || status === 'failed' || status === 'canceled' || status === 'cancelled') {
  console.error(`Request did not complete. Status: ${status}`);
  process.exit(1);
}
if (!url) {
  console.error(`No video URL returned. Status: ${status ?? 'unknown'}`);
  process.exit(1);
}

console.log(`Status: ${status ?? 'completed'}`);
console.log(`Video URL: ${url}`);
