# Handoff — Quietwall polish round 1

## Outcome

All 84 findings in `.factory/review-1.md` are addressed. The complete finding-by-finding map is in `.factory/polish-1.md`.

Production: <https://android-site-blocker-private.sociobot.in>

Demo: <https://android-site-blocker-private.sociobot.in/?demo=1>

Repair source: `1669de0` and its preceding focused commits on `main`.

## What changed

- Replaced the first-screen slogan with the product job and named Android audience.
- Added adjacent sample-demo and public APK actions with clear outcomes.
- Added an isolated `quietwall-demo` IndexedDB database, four sample domains, focus hours, pause delay, persistent banner, reset, and real-mode exit.
- Made browser states honest: the web saves and exports lists but never reports traffic as blocked.
- Published a self-contained, debug-signed Android preview APK with a SHA-256 file.
- Prevented recursive APK embedding during Capacitor sync.
- Added a three-frame original pixel-art Android walkthrough.
- Added route-specific titles, descriptions, canonicals, Open Graph/Twitter metadata, social card, touch icon, consistent navigation/footer, focus announcements, scroll restoration, and a styled real 404.
- Rewrote landing, state, legal, and README copy in plain language.
- Added `.factory/claims.json` with 15 uniquely tagged claim tests.
- Added mobile target/overflow, keyboard, axe, privacy, offline, metadata, routing, demo, APK, signature, and native-contract coverage.
- Added an Android emulator test that sends a matching DNS request through the real `VpnService` tunnel and expects NXDOMAIN.

## Verification evidence

### Clean clone

Clean clone `/tmp/quietwall-final-clean-n8NDNB` at `45b15c7b5686d6d3d4a7b796659e53fca3782b10`:

- `npm ci` — PASS, 0 vulnerabilities.
- `npm test` — PASS: 12 Vitest, 6 native-contract, 1 precache, and 23 Playwright passes; 1 intentional desktop skip for the mobile-only assertion.
- `npm run build` — PASS; `dist/index.html` and all route files emitted.
- Every one of the 15 exact `.factory/claims.json` commands — PASS independently.
- Final Android workflow checkout at `1669de0` — [build/unit job](https://github.com/B-Divyesh/sf-android-site-blocker-private/actions/runs/33222738928/job/99020054187) PASS and [Android 35 device tunnel job](https://github.com/B-Divyesh/sf-android-site-blocker-private/actions/runs/33222738928/job/99020054090) PASS (`INSTRUMENTATION_CODE: 0`).

### Production

- `verify-url.sh https://android-site-blocker-private.sociobot.in .factory/evidence/live` — PASS; 802 ms load, no console errors, title/lang/h1/main/alt/button checks pass.
- Full Playwright suite against production — PASS: 23 tests, with the single mobile-only desktop skip.
- `npx @axe-core/cli` against production — PASS, 0 violations.
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100.
- Lighthouse metrics: LCP 1.1 s, CLS 0, total blocking time 0 ms.
- `/does-not-exist` — HTTP 404 with the Quietwall page.
- `/`, `/?demo=1`, `/demo/`, `/privacy/`, `/terms/`, `/offline.html`, `/404.html`, manifest, robots, sitemap, APK, and checksum — expected 200 responses.
- Production headers include the matching CSP, `nosniff`, no-referrer, permissions policy, and no-cache HTML behavior.
- APK MIME type is `application/vnd.android.package-archive`.
- Live APK SHA-256: `2e158dc7a296481e096cf36b5cd975f50b8fa176ba05e37b72e2716d32c32625`.
- Live privacy test records same-origin requests only for the full demo flow.
- Live offline test reloads `?demo=1` with seeded data after network disable.
- JS: 31.70 KB raw / 11.60 KB gzip. CSS: 15.61 KB raw / 4.25 KB gzip.

Evidence files are under `.factory/evidence/`, including local and live screenshots, `verify.json`, and Lighthouse JSON.

## Run and verify

```sh
npm ci
npm test
npm run build
```

Run the exact commands in `.factory/claims.json` to verify each public claim separately.

For Android:

```sh
npm run cap:sync
cd android
./gradlew test assembleDebug
```

The GitHub workflow also runs the VPN tunnel test on an Android 35 emulator.

## Product boundaries

Quietwall filters standard UDP DNS after Android VPN consent. Encrypted DNS, direct IP traffic, another VPN, or uninstalling the app can bypass it. It is not parental control.

The published APK is an installable debug-signed preview, clearly labeled as such. Store release signing remains outside this static repair work order.

## Known gaps

None within this work order. No review finding or deferred TODO remains.
