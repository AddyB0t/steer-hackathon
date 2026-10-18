import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });

const id = process.argv[2];
const res = await fetch(`https://api.higgsfield.ai/requests/${id}/status`, {
  headers: { Authorization: `Key ${process.env.HF_CREDENTIALS}` },
});
const body = await res.json().catch(() => ({}));
console.log(JSON.stringify({ http: res.status, status: body.status, url: body.video?.url ?? null }));
