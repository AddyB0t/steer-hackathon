import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { render } from './render.js';

const dir = process.argv[2];
const slug = path.basename(dir);
const papers = JSON.parse(await readFile('papers/papers.json', 'utf8'));
const content = JSON.parse(await readFile(path.join(dir, 'content.json'), 'utf8'));

const files = await render(content, papers[slug], dir);
console.log(files.join('\n'));
