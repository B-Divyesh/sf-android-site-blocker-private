import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const packageName = 'in.sociobot.androidsiteblockerprivate';
const runner = `${packageName}/.ClaimInstrumentation`;
const claims = {
  // @claim:android-dns-filter
  'android-dns-filter': true,
  // @claim:native-privacy
  'native-privacy': true,
  // @claim:network-resolver
  'network-resolver': true,
  // @claim:filter-boundary
  'filter-boundary': true,
  // @claim:pause-delay
  'pause-delay': true
};

const selected = process.argv.find((argument) => argument.startsWith('--claim='))?.slice(8);
if (selected && !claims[selected]) throw new Error(`Unknown Android claim: ${selected}`);

function run(command, args, options = {}) {
  return execFileSync(command, args, { cwd: root, encoding: 'utf8', stdio: options.capture ? 'pipe' : 'inherit', ...options });
}

const devices = run('adb', ['devices'], { capture: true });
assert.match(devices, /\n\S+\s+device\b/, 'A booted, clean Android emulator is required.');

const apk = resolve(root, 'public/downloads/quietwall.apk');
const checksumFile = resolve(root, 'public/downloads/quietwall.apk.sha256');
const expected = readFileSync(checksumFile, 'utf8').trim().split(/\s+/)[0];
const actual = createHash('sha256').update(readFileSync(apk)).digest('hex');
assert.equal(actual, expected, 'The published APK must match its public checksum.');

run('adb', ['install', '-r', '-t', apk]);
try { run('adb', ['shell', 'pm', 'clear', packageName]); } catch { /* A first install is already clean. */ }
run('adb', ['shell', 'appops', 'set', packageName, 'ACTIVATE_VPN', 'allow']);

const targets = selected ? [selected] : Object.keys(claims);
for (const claim of targets) {
  const output = run('adb', ['shell', 'am', 'instrument', '-w', '-r', '-e', 'claim', claim, runner], { capture: true });
  process.stdout.write(output);
  assert.match(output, /status=PASS/, `Android runtime claim ${claim} failed.`);
  assert.match(output, /INSTRUMENTATION_CODE: -1|INSTRUMENTATION_CODE: 0/, `Android runtime claim ${claim} did not finish cleanly.`);
  process.stdout.write(`PASS @claim:${claim} — published APK ${actual.slice(0, 12)} on clean emulator\n`);
}
