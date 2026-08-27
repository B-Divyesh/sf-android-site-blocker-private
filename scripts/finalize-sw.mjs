import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

const root = new URL('../dist/', import.meta.url).pathname;
// Azure Static Web Apps consumes these files as deployment directives rather than
// serving them. They must never enter cache.addAll(), which rejects the complete
// install when any one URL is a non-2xx response.
const DEPLOYMENT_CONTROL_FILES = new Set(['staticwebapp.config.json', '_headers']);

async function filesIn(directory) {
  const entries = await readdir(directory);
  const files = [];
  for (const entry of entries) {
    const fullPath = join(directory, entry);
    if ((await stat(fullPath)).isDirectory()) files.push(...await filesIn(fullPath));
    else files.push(fullPath);
  }
  return files;
}

const assets = (await filesIn(root))
  .map((file) => `/${relative(root, file).split(sep).join('/')}`)
  // Precache only the application shell and its emitted assets. Deployment
  // directives, crawler metadata, and the worker itself are deliberately not
  // install dependencies.
  .filter((path) => {
    const name = path.split('/').at(-1);
    return path.startsWith('/assets/') || path === '/offline.html' || path === '/manifest.webmanifest';
  })
  .filter((path) => !DEPLOYMENT_CONTROL_FILES.has(path.split('/').at(-1)))
  .sort();
const swPath = join(root, 'sw.js');
const source = await readFile(swPath, 'utf8');
const version = createHash('sha256').update(JSON.stringify(assets)).digest('hex').slice(0, 10);
const next = source.replace("const CACHE = 'quietwall-shell-v1';", `const CACHE = 'quietwall-shell-${version}';`).replace(
  "const SHELL = ['/', '/offline.html', '/privacy/', '/terms/', '/manifest.webmanifest', '/assets/icon.svg', '/assets/quietwall-gate.webp'];",
  `const SHELL = ${JSON.stringify(['/', '/privacy/', '/terms/', ...assets])};`
);
if (source === next) throw new Error('Service worker shell marker was not found.');
await writeFile(swPath, next);
