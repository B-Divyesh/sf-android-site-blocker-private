# Handoff — verification 5

## Outcome

Verification 5 is **FAIL** with five findings and five untested claims. Product code was not changed.

Implementation candidate: `ba3701dc2a1d69ce0b5dbc52ade8d5fd32a18126`. Documentation and test-harness state reviewed: `7be7e85b9f5b30a8ae620725e3b3673355506a2b`.

## Completed checks

- Clean `npm ci`, `npm test`, `npm run build`, and `npm run cap:sync` passed.
- Clean `./gradlew test assembleDebug --no-daemon` passed with JDK 21 and Android SDK 35.
- All ten non-emulator claim commands passed exactly as declared.
- The complete live Playwright suite passed: 26 tests with 2 intentional project skips.
- Fresh desktop and 390 × 844 browser checks covered the first screen, one-click demo, real/demo isolation, reset, normal/invalid/boundary/recovery paths, keyboard focus, reduced motion, offline reload, update notice, links, titles, legal pages, and the designed HTTP 404.
- Axe found zero violations at either width on home, demo, privacy, terms, and 404.
- Live Lighthouse scored 100 in performance, accessibility, best practices, and SEO. LCP was 1.01 s and CLS was 0.
- Live output matches the generated web shell. The public APK matches the repository artifact and published SHA-256: `4e0fca19c1719a86e29db74f328377d258b91ab7e57f5a0ba9ccaf0728d05b34`.
- Automatic browser traffic remained same-origin. Security headers, cache policy, and manifest MIME passed.

## Fresh Android evidence

Three clean API 35 attempts failed inside the emulator wrapper before `node scripts/run-claim-registry.mjs` started:

- <https://github.com/B-Divyesh/sf-android-site-blocker-private/actions/runs/34003372436> — wrapper key event failed with a broken pipe after boot.
- <https://github.com/B-Divyesh/sf-android-site-blocker-private/actions/runs/34004101437> — wrapper input and overlay calls failed with broken pipes.
- <https://github.com/B-Divyesh/sf-android-site-blocker-private/actions/runs/34006155513> — emulator boot timed out.

A fourth run from the documentation-only report push reached the registry: <https://github.com/B-Divyesh/sf-android-site-blocker-private/actions/runs/34007022141>. It passed all ten non-Android commands, installed the checksum-verified APK, then failed `network-resolver` because the emulator exposed no underlying DNS service during the 180-second preflight. The other four Android commands were skipped by fail-fast.

The five Android behaviors therefore have no fresh result. The last known successful installed-APK run is `33243763594` at test commit `73f374e`; it is historical evidence only.

## Evidence

- `.factory/verification-5.md`
- `.factory/evidence/verification-5/live-browser.json`
- `.factory/evidence/verification-5/home-desktop.png`
- `.factory/evidence/verification-5/home-mobile.png`
- `.factory/evidence/verification-5/demo-mobile-first-view.png`
- `.factory/evidence/verification-5/404-mobile.png`
- `.factory/evidence/verification-5/verify-url/verify.json`
- `.factory/evidence/verification-5/lighthouse-live.json`

## Run again

```sh
npm ci
npm test
npm run build
npm run cap:sync
cd android && ./gradlew test assembleDebug --no-daemon
```

With a clean booted API 35 emulator and deterministic DNS fixture:

```sh
node scripts/run-claim-registry.mjs
```

## Known gaps

The five public Android runtime claims remain untested in this round. Run their exact commands against the published APK on a clean, stable API 35 device before declaring PASS. No browser, accessibility, privacy, performance, route, build, package, or live-output defect was found.
