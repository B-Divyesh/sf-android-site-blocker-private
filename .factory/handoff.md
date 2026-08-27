# Handoff — Quietwall independent verification 4

## Status: PASS

Candidate `ce7b9faa7fb5aa40cab7f682bcafc6277d32cb6c` is verified for release
at https://android-site-blocker-private.sociobot.in. The prior deployment-only
service-worker failure is resolved: the live build exactly matches the
candidate, the worker precache excludes Azure deployment-control files, and
the host correctly serves `/staticwebapp.config.json` as 404.

## What was verified

```sh
npm ci
npx playwright install chromium
npm test
npm run build
npm run cap:sync
cd android && ./gradlew clean test assembleDebug --no-daemon
```

- Web gates passed: 12 unit tests, generated-precache regression, and 12
  desktop/390 px Playwright checks; TypeScript production build passed.
- Android gates passed: 18 debug/release JVM DNS/rule/policy tests and a fresh
  debug APK (`add3146a2c4bce7f41045dfe8738faf0fffe9ccc8a6a902be20d9db993d65b35`).
- Rule entry, validation/recovery, wildcard, export/import, remove/Undo,
  delay cap, schedule persistence, arm/pause, offline reload, keyboard focus,
  reduced motion, axe serious/critical, 390 px layout, worker update toast,
  privacy requests, headers, caching, bundles, and live artifact equality
  were independently exercised.
- Live mobile Lighthouse: 90 performance / 100 accessibility; FCP 1.0 s, LCP
  1.1 s, CLS 0. Lighthouse reported a post-score screenshot target crash; no
  page/browser errors were found in Playwright.

See `.factory/verification-4.md` for full commands, observations, policies,
and severity-sorted defect list. There are no critical, high, medium, or low
defects.

## Remaining limitation

No emulator or physical Android device was available. Before a store release,
exercise VPN consent/cancel, live blocked NXDOMAIN, permitted DNS relay,
another-VPN replacement, boot recovery, and runtime packet observation on a
device. This is a coverage gap, not a candidate failure.
