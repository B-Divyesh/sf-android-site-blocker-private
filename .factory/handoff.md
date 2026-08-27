# Handoff — Quietwall precache repair

## Status

**Release blocker repaired and deployed.** The Standard Azure Static Web App at
https://android-site-blocker-private.sociobot.in is serving the committed PWA
repair. `staticwebapp.config.json` is a production 404 as expected, and it is
not (nor are `_headers`, `sw.js`, crawler metadata, or any other deployment
control path) in the generated service-worker install list.

Commits:

- `66c71e4 fix: precache only deployable app shell`
- `1c505b6 fix: announce waiting service worker on focus`

## What changed

- `scripts/finalize-sw.mjs` now precaches only routes required by the app shell
  (`/`, legal routes, manifest, offline page, and emitted `/assets/`). It
  deliberately excludes Azure deployment directives and all non-app paths.
- `scripts/verify-precache.test.mjs` is an exact generated-output regression:
  it builds the site and requires the worker `SHELL` array to equal the allowed
  deployable shell exactly. It explicitly rejects `staticwebapp.config.json`,
  `_headers`, and `sw.js`.
- `npm test` runs this generated-precache regression before the browser suite.
- The PWA checks for a waiting worker when the installed app regains focus and
  immediately exposes the existing reload toast.
- Native schedule/pause policy now accepts an injected time boundary and has
  deterministic JVM coverage for normal/overnight schedules, delayed pause
  expiry, disabled protection, and an empty list.

## Verification performed (2026-08-27)

```sh
npm ci
npx playwright install chromium
npm test
npm run cap:sync
cd android
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 \
ANDROID_HOME=/tmp/quietwall-android-sdk \
ANDROID_SDK_ROOT=/tmp/quietwall-android-sdk \
./gradlew clean test assembleDebug --no-daemon
```

- `npm test`: **PASS** — 12 Vitest tests, exact generated-precache test, and
  12 Playwright desktop/mobile checks. This includes saved-state offline reload
  using `context.setOffline(true)` and axe serious/critical coverage.
- Clean Android build: **PASS** — debug APK produced at
  `android/app/build/outputs/apk/debug/app-debug.apk`; SHA-256
  `3bd4785435a1fba36a5cbd0ed1ff7a405f068ffea0f2b10598fcde4ac9770f1c`.
  18 deterministic JVM tests passed in each debug and release variant:
  domain matching, malformed packet rejection, IPv4/IPv6 UDP framing, local
  NXDOMAIN construction, schedules, and delayed-pause policy.
- `adb devices`: no emulator/device was attached. Therefore VPN consent/cancel,
  actual allowed-resolver relay, boot recovery, and other-VPN replacement were
  not represented as physical-device results. The JVM packet/policy tests are
  retained for the testable core; a real Android validation remains the only
  known verification gap.
- Fresh production Pixel 5 profile: **PASS** — worker installed/controlled;
  a saved `live-offline.example` rule survived offline reload; no console
  errors; page requests stayed on the product origin (no telemetry endpoint).
- Controlled production two-version rollout: **PASS** — the installed Pixel 5
  session detected the new worker and displayed `#toast` / Reload with no
  console errors.
- Production mobile Lighthouse (simulated throttling): **100 performance / 100
  accessibility** twice; FCP/LCP were 1.0 s and 0.9 s, respectively; CLS 0.

## Deployment

Deployed as a **Standard** Azure Static Web App using:

```sh
/opt/fleet/lib/deploy-static.sh android-site-blocker-private dist
```

The final live worker cache is `quietwall-shell-e4be3ffd91` and its exact
precache excludes `/staticwebapp.config.json`; the host returns that control
path as 404 without breaking worker installation.

## Remaining next step

Run the APK on a real Android device or emulator with packet observation to
exercise Android VPN consent/cancel, blocked NXDOMAIN, permitted DNS relay,
scheduled/delayed pause across boot, another-VPN replacement, and the absence
of telemetry at runtime. This is a hardware-environment limitation, not a
claim of completed device validation.
