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

// The registry invokes this file once per native claim. Keep the exact published APK installed
// across those invocations, while clearing all app data before every claim. Reinstalling the
// same package five times made Android rebuild network state under severe emulator load and
// could delay an external DNS probe beyond the observation window.
const apkMarker = '/data/local/tmp/quietwall-apk.sha256';
let installedChecksum = '';
let installedPackage = '';
try { installedChecksum = run('adb', ['shell', 'cat', apkMarker], { capture: true }).trim().split(/\s+/)[0]; } catch { /* First claim on this clean emulator. */ }
try { installedPackage = run('adb', ['shell', 'pm', 'path', packageName], { capture: true }).trim(); } catch { /* Package is not installed yet. */ }
const needsInstall = installedChecksum !== actual || !installedPackage.startsWith('package:');
if (needsInstall) {
  run('adb', ['install', '-r', '-t', apk]);
  run('adb', ['push', checksumFile, apkMarker]);
}
try { run('adb', ['shell', 'pm', 'clear', packageName]); } catch { /* A first install is already clean. */ }
run('adb', ['shell', 'appops', 'set', packageName, 'ACTIVATE_VPN', 'allow']);
// GitHub's cold API 35 image performs background dex work under heavy boot load. Compile this
// exact installed package before instrumentation so the process is not selected for boot-time
// pressure termination; this does not create or retain application data.
if (needsInstall) run('adb', ['shell', 'cmd', 'package', 'compile', '-m', 'speed', '-f', packageName]);

if (selected === 'network-resolver') {
  let networkReady = false;
  const networkDeadline = Date.now() + 60_000;
  while (Date.now() < networkDeadline) {
    const check = spawnSync('adb', ['shell', 'ping', '-c', '1', '-W', '2', 'android.com'], { cwd: root, encoding: 'utf8' });
    const checkOutput = `${check.stdout ?? ''}${check.stderr ?? ''}`;
    if (!/bad address|unknown host|name or service not known|temporary failure in name resolution/i.test(checkOutput)) {
      networkReady = true;
      break;
    }
    await new Promise((resolveNetwork) => setTimeout(resolveNetwork, 1000));
  }
  assert.equal(networkReady, true, 'The clean emulator did not expose its underlying DNS service before the resolver claim.');
}

const targets = selected ? [selected] : Object.keys(claims);
for (const claim of targets) {
  const probeDomain = claim === 'android-dns-filter'
    ? `blocked-${Date.now()}.example.com`
    : claim === 'native-privacy'
      ? `private-${Date.now()}.example.org`
      : claim === 'pause-delay'
        ? `pause-${Date.now()}.example.net`
        : claim === 'network-resolver'
          ? 'iana.org'
          : '';
  const instrumentationArgs = ['shell', 'am', 'instrument', '-w', '-r', '-e', 'claim', claim];
  if (probeDomain) instrumentationArgs.push('-e', 'domain', probeDomain);
  instrumentationArgs.push(runner);
  let child;
  let childDone;
  let childExit;
  let output = '';
  if (claim !== 'filter-boundary') {
    const ready = `READY:${claim}`;
    let readyLogs = '';
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      run('adb', ['logcat', '-c']);
      output = '';
      childExit = undefined;
      child = spawn('adb', instrumentationArgs, { cwd: root });
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => { output += chunk; });
      child.stderr.on('data', (chunk) => { output += chunk; });
      childDone = new Promise((resolveExit) => child.on('close', (code) => { childExit = code; resolveExit(code); }));

      // A freshly booted API 35 emulator may spend close to a minute compiling and starting the
      // first installed process. This remains a readiness bound, not the claim's result timeout.
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        readyLogs = run('adb', ['logcat', '-d', '-s', 'QuietwallClaim:I'], { capture: true });
        if (readyLogs.includes(ready) || childExit !== undefined) break;
        await new Promise((resolveReady) => setTimeout(resolveReady, 250));
      }
      if (readyLogs.includes(ready)) break;

      if (childExit === undefined) {
        run('adb', ['shell', 'am', 'force-stop', packageName]);
        await childDone;
      }
      const preReadyCrash = /Process crashed|INSTRUMENTATION_FAILED|shortMsg=/i.test(output);
      if (!preReadyCrash || attempt === 2) break;

      process.stderr.write(`Android killed the ${claim} instrumentation process before readiness; retrying once after package compilation.\n`);
      run('adb', ['shell', 'pm', 'clear', packageName]);
      run('adb', ['shell', 'appops', 'set', packageName, 'ACTIVATE_VPN', 'allow']);
      run('adb', ['shell', 'cmd', 'package', 'compile', '-m', 'speed', '-f', packageName]);
      await new Promise((resolveRetry) => setTimeout(resolveRetry, 5000));
    }
    if (!readyLogs.includes(ready)) {
      process.stderr.write(output);
      process.stderr.write(run('adb', ['logcat', '-d', '-t', '500'], { capture: true }));
    }
    assert.match(readyLogs, new RegExp(ready), `Android runtime claim ${claim} did not become ready.`);

    const probeNames = claim === 'network-resolver'
      ? [probeDomain]
      : Array.from({ length: claim === 'pause-delay' ? 5 : 3 }, (_, index) => `probe-${index + 1}.${probeDomain}`);
    // Start one Android shell process for the whole probe set. A cold API 35 image can take
    // several seconds to schedule each new adb shell process, which needlessly consumed the
    // instrumentation observation window when every probe launched separately.
    const probeScript = probeNames.map((domain) => `ping -c 1 -W 2 ${domain}`).join('; ');
    const probe = spawnSync('adb', ['shell', probeScript], { cwd: root, encoding: 'utf8' });
    const probeOutput = `${probe.stdout ?? ''}${probe.stderr ?? ''}`;
    if (claim === 'network-resolver') {
      assert.doesNotMatch(probeOutput, /bad address|unknown host|name or service not known|temporary failure in name resolution/i, 'Allowed DNS request did not resolve.');
    } else {
      assert.match(probeOutput, /bad address|unknown host|name or service not known|temporary failure in name resolution/i, 'Matching DNS request did not return a not-found result.');
    }
    if (claim === 'pause-delay') {
      await new Promise((resolveExpiry) => setTimeout(resolveExpiry, 30_500));
      spawnSync('adb', ['shell', 'ping', '-c', '1', '-W', '2', `after-expiry.${probeDomain}`], { cwd: root, encoding: 'utf8' });
    }
  } else {
    run('adb', ['logcat', '-c']);
    child = spawn('adb', instrumentationArgs, { cwd: root });
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    childDone = new Promise((resolveExit) => child.on('close', (code) => { childExit = code; resolveExit(code); }));
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
