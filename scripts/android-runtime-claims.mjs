import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
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
  run('adb', ['logcat', '-c']);
  const child = spawn('adb', ['shell', 'am', 'instrument', '-w', '-r', '-e', 'claim', claim, runner], { cwd: root });
  let output = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  const childDone = new Promise((resolveExit) => child.on('close', resolveExit));
  if (claim !== 'filter-boundary') {
    const ready = `READY:${claim}`;
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
      const logs = run('adb', ['logcat', '-d', '-s', 'QuietwallClaim:I'], { capture: true });
      if (logs.includes(ready)) break;
      await new Promise((resolveReady) => setTimeout(resolveReady, 250));
    }
    const readyLogs = run('adb', ['logcat', '-d', '-s', 'QuietwallClaim:I'], { capture: true });
    assert.match(readyLogs, new RegExp(ready), `Android runtime claim ${claim} did not become ready.`);

    const domain = claim === 'android-dns-filter' ? 'example.com' : claim === 'native-privacy' ? 'example.org' : claim === 'pause-delay' ? 'example.net' : 'iana.org';
    const probe = spawnSync('adb', ['shell', 'ping', '-c', '1', '-W', '2', domain], { cwd: root, encoding: 'utf8' });
    const probeOutput = `${probe.stdout ?? ''}${probe.stderr ?? ''}`;
    if (claim === 'network-resolver') {
      assert.doesNotMatch(probeOutput, /bad address|unknown host|name or service not known|temporary failure in name resolution/i, 'Allowed DNS request did not resolve.');
    } else {
      assert.match(probeOutput, /bad address|unknown host|name or service not known|temporary failure in name resolution/i, 'Matching DNS request did not return a not-found result.');
    }
    if (claim === 'pause-delay') {
      await new Promise((resolveExpiry) => setTimeout(resolveExpiry, 8_500));
      spawnSync('adb', ['shell', 'ping', '-c', '1', '-W', '2', domain], { cwd: root, encoding: 'utf8' });
    }
  }

  const exitCode = await childDone;
  process.stdout.write(output);
  if (!output.includes('status=PASS')) {
    process.stderr.write(run('adb', ['logcat', '-d', '-t', '500'], { capture: true }));
  }
  assert.equal(exitCode, 0, `Android instrumentation process for ${claim} exited unsuccessfully.`);
  assert.match(output, /status=PASS/, `Android runtime claim ${claim} failed.`);
  assert.match(output, /INSTRUMENTATION_CODE: -1|INSTRUMENTATION_CODE: 0/, `Android runtime claim ${claim} did not finish cleanly.`);
  process.stdout.write(`PASS @claim:${claim} — published APK ${actual.slice(0, 12)} on clean emulator\n`);
}
