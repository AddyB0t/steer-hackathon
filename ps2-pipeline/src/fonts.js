// Fonts for satori, bundled from npm so a Linux server renders exactly what a
// Windows laptop does. Gelasio is metric-compatible with Georgia, the brand
// serif, so headlines wrap the same way.

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const file = (pkg, name) => require.resolve(`@fontsource/${pkg}/files/${name}`);

export const fonts = await Promise.all(
  [
    ['Serif', file('gelasio', 'gelasio-latin-400-normal.woff'), 400, 'normal'],
    ['Serif', file('gelasio', 'gelasio-latin-400-italic.woff'), 400, 'italic'],
    ['Sans', file('inter', 'inter-latin-400-normal.woff'), 400, 'normal'],
    ['Sans', file('inter', 'inter-latin-700-normal.woff'), 700, 'normal'],
  ].map(async ([name, path, weight, style]) => ({ name, data: await readFile(path), weight, style })),
);
