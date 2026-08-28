import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import test from 'node:test';

const root = new URL('../dist/', import.meta.url).pathname;

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

test('generated service-worker precache is exactly the deployable application shell', async () => {
  const source = await readFile(join(root, 'sw.js'), 'utf8');
  const match = source.match(/const SHELL = (\[[^;]+\]);/);
  assert.ok(match, 'generated worker must contain a concrete SHELL array');
  const actual = JSON.parse(match[1]);
  const emittedAssets = (await filesIn(root))
    .map((file) => `/${relative(root, file).split(sep).join('/')}`)
    .filter((path) => path.startsWith('/assets/') || path === '/manifest.webmanifest' || path === '/offline.html')
    .sort();
  const expected = ['/', '/demo/', '/privacy/', '/terms/', '/404.html', ...emittedAssets];

  assert.deepEqual(actual, expected);
  assert.equal(actual.includes('/staticwebapp.config.json'), false);
  assert.equal(actual.includes('/_headers'), false);
  assert.equal(actual.includes('/sw.js'), false);
  assert.equal(actual.some((path) => /(?:^|\/)(?:staticwebapp\.config\.json|_headers)$/.test(path)), false);
});
