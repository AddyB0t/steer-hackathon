import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tidy } from './content.js';

const file = path.join(process.argv[2], 'content.json');
const content = JSON.parse(await readFile(file, 'utf8'));
content.plan = tidy(content.plan);
await writeFile(file, JSON.stringify(content, null, 2));
console.log('dashes left:', (JSON.stringify(content.plan).match(/[—–]/g) || []).length);
