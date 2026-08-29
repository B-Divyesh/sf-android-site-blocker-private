import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const packageName = 'in.sociobot.androidsiteblockerprivate';
const runner = `${packageName}.test/androidx.test.runner.AndroidJUnitRunner`;
const testClass = `${packageName}.QuietwallVpnInstrumentedTest`;
const methods = {
  // @claim:android-dns-filter
  'android-dns-filter': 'matchingDnsRequestReceivesNxdomainThroughVpnTunnel',
  // @claim:native-privacy
  'native-privacy': 'blockedFlowHasNoEgressOrBrowsingLog',
  // @claim:network-resolver
  'network-resolver': 'allowedDnsRequestUsesCurrentNetworkOutsideVpnLoop',
  // @claim:filter-boundary
  'filter-boundary': 'installedManifestLimitsEnforcementToVpnService',
  // @claim:pause-delay
  'pause-delay': 'pauseDelayKeepsVpnActiveUntilExpiry'
};

const selected = process.argv.find((argument) => argument.startsWith('--claim='))?.slice(8);
if (selected && !methods[selected]) throw new Error(`Unknown Android claim: ${selected}`);

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

const testApk = resolve(root, 'android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk');
if (!existsSync(testApk)) run(resolve(root, 'android/gradlew'), [':app:assembleDebugAndroidTest', '--no-daemon'], { cwd: resolve(root, 'android') });

run('adb', ['install', '-r', '-t', apk]);
try { run('adb', ['shell', 'pm', 'clear', packageName]); } catch { /* A first install is already clean. */ }
run('adb', ['install', '-r', '-t', testApk]);
run('adb', ['shell', 'appops', 'set', packageName, 'ACTIVATE_VPN', 'allow']);

const targets = selected ? [[selected, methods[selected]]] : Object.entries(methods);
for (const [claim, method] of targets) {
  const output = run('adb', ['shell', 'am', 'instrument', '-w', '-r', '-e', 'class', `${testClass}#${method}`, runner], { capture: true });
  process.stdout.write(output);
  assert.match(output, /OK \(1 test\)/, `Android runtime claim ${claim} failed.`);
  process.stdout.write(`PASS @claim:${claim} — published APK ${actual.slice(0, 12)} on clean emulator\n`);
}
