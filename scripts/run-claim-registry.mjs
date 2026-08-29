import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const claims = JSON.parse(readFileSync(new URL('../.factory/claims.json', import.meta.url), 'utf8'));
for (const claim of claims) {
  process.stdout.write(`\n=== @claim:${claim.id} ===\n${claim.test}\n`);
  execSync(claim.test, { cwd: new URL('..', import.meta.url), encoding: 'utf8', stdio: 'inherit', shell: '/bin/bash' });
}
process.stdout.write(`\nPASS: ${claims.length} claim commands completed from the registry.\n`);
