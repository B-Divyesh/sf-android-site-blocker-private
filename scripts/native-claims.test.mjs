import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const apkPath = new URL('../public/downloads/quietwall.apk', import.meta.url).pathname;

test('the APK packages the local VPN, matcher, DNS response, and consent path', async () => {
  const service = await readFile(new URL('../android/app/src/main/java/in/sociobot/androidsiteblockerprivate/QuietwallVpnService.java', import.meta.url), 'utf8');
  const plugin = await readFile(new URL('../android/app/src/main/java/in/sociobot/androidsiteblockerprivate/QuietwallVpnPlugin.java', import.meta.url), 'utf8');
  const matcherTest = await readFile(new URL('../android/app/src/test/java/in/sociobot/androidsiteblockerprivate/RuleMatcherTest.java', import.meta.url), 'utf8');
  const packetTest = await readFile(new URL('../android/app/src/test/java/in/sociobot/androidsiteblockerprivate/DnsPacketTest.java', import.meta.url), 'utf8');
  const manifest = await readFile(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
  assert.match(service, /extends VpnService/);
  assert.match(service, /DnsMessage\.nxdomain/);
  assert.match(service, /RuleMatcher\.matches/);
  assert.match(service, /startForeground\(NOTIFICATION_ID, notification/);
  assert.match(plugin, /VpnService\.prepare/);
  assert.match(matcherTest, /bareDomainMatchesApexAndSubdomains/);
  assert.match(packetTest, /parsesAndAnswersIpv4DnsWithoutChangingQuestion/);
  assert.match(manifest, /android\.permission\.ACCESS_NETWORK_STATE/);
  const dexStrings = execFileSync('sh', ['-c', `unzip -p '${apkPath}' classes4.dex | strings`], { encoding: 'utf8' });
  assert.match(dexStrings, /QuietwallVpnService/);
  assert.match(dexStrings, /RuleMatcher/);
});

test('@claim:apk-signature verifies the published package signature and checksum', async () => {
  const apk = await readFile(apkPath);
  const entries = execFileSync('unzip', ['-Z1', apkPath], { encoding: 'utf8' });
  assert.match(entries, /META-INF\/CERT\.RSA/);
  assert.match(entries, /AndroidManifest\.xml/);
  assert.doesNotMatch(entries, /assets\/public\/downloads\/quietwall\.apk/);
  const certificate = execFileSync('sh', ['-c', `unzip -p '${apkPath}' META-INF/CERT.RSA | openssl pkcs7 -inform DER -print_certs -noout`], { encoding: 'utf8' });
  assert.match(certificate, /CN\s*=\s*Android Debug/);
  const expected = (await readFile(new URL('../public/downloads/quietwall.apk.sha256', import.meta.url), 'utf8')).split(/\s+/)[0];
  assert.equal(createHash('sha256').update(apk).digest('hex'), expected);
});

test('Android dependencies contain no analytics client, remote API, or browsing-log store', async () => {
  const javaDir = new URL('../android/app/src/main/java/in/sociobot/androidsiteblockerprivate/', import.meta.url);
  const sources = await Promise.all((await readdir(javaDir)).filter((name) => name.endsWith('.java')).map((name) => readFile(new URL(name, javaDir), 'utf8')));
  const combined = sources.join('\n');
  assert.doesNotMatch(combined, /firebase|analytics|telemetry|crashlytics|https?:\/\//i);
  assert.doesNotMatch(combined, /INSERT\s+INTO|SQLiteDatabase|RoomDatabase/i);
  assert.match(combined, /getSharedPreferences\(PREFS, Context\.MODE_PRIVATE\)/);
  void root;
});

test('the resolver implementation excludes hard-coded external resolvers', async () => {
  const service = await readFile(new URL('../android/app/src/main/java/in/sociobot/androidsiteblockerprivate/QuietwallVpnService.java', import.meta.url), 'utf8');
  const runtime = await readFile(new URL('../android/app/src/debug/java/in/sociobot/androidsiteblockerprivate/ClaimInstrumentation.java', import.meta.url), 'utf8');
  assert.match(service, /getDnsServers\(\)/);
  assert.match(service, /protect\(socket\)/);
  assert.match(service, /socket\.connect\(resolver, 53\)/);
  assert.doesNotMatch(service, /8\.8\.8\.8|1\.1\.1\.1|https?:\/\//);
  assert.match(runtime, /getActiveNetwork\(\)/);
  assert.match(runtime, /hasTransport\(NetworkCapabilities\.TRANSPORT_VPN\)/);
  assert.match(runtime, /10\.99\.0\.2/);
});

test('the package source limits enforcement to UDP DNS without device-admin permissions', async () => {
  const service = await readFile(new URL('../android/app/src/main/java/in/sociobot/androidsiteblockerprivate/QuietwallVpnService.java', import.meta.url), 'utf8');
  const packet = await readFile(new URL('../android/app/src/main/java/in/sociobot/androidsiteblockerprivate/IpPacket.java', import.meta.url), 'utf8');
  const manifest = await readFile(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
  assert.match(service, /destinationPort != 53/);
  assert.match(packet, /parseUdp/);
  assert.doesNotMatch(manifest, /DEVICE_ADMIN|BIND_DEVICE_ADMIN/);
});

test('the pause implementation stores its expiry and schedules an Android alarm', async () => {
  const plugin = await readFile(new URL('../android/app/src/main/java/in/sociobot/androidsiteblockerprivate/QuietwallVpnPlugin.java', import.meta.url), 'utf8');
  const policy = await readFile(new URL('../android/app/src/main/java/in/sociobot/androidsiteblockerprivate/RuleStore.java', import.meta.url), 'utf8');
  const policyTest = await readFile(new URL('../android/app/src/test/java/in/sociobot/androidsiteblockerprivate/RuleStorePolicyTest.java', import.meta.url), 'utf8');
  assert.match(plugin, /setAndAllowWhileIdle\(AlarmManager\.RTC_WAKEUP, unlockAt/);
  assert.match(policy, /state\.unlockAt > 0 && now >= state\.unlockAt/);
  assert.match(policyTest, /pauseExpiryAndDisarmedStateCannotFilter/);
});
