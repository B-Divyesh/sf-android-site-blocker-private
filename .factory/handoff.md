# Handoff — perfection loop round 2

## Outcome

All findings in `.factory/review-1.md` and `.factory/review-2.md` are closed. Quietwall keeps its pixel control-room identity, static PWA deployment, isolated browser demo, public Android preview APK, and Capacitor project.

The round-2 repair:

- opens `/?demo=1` and `/demo/` directly on a focused, working sample;
- shows all four rules, enabled/paused state, focus hours, and delay within 390 × 844;
- keeps demo and real IndexedDB databases isolated through reset and exit;
- replaces five source-regex Android claim commands with clean-emulator tests against the installed public APK;
- removes the unregistered hero transfer sentence and README build-behavior sentence;
- rewrites the checksum action in plain language;
- retains real routes, route titles, focus/history behavior, styled 404, legal links, offline shell, and product-specific responsive styling.

The complete finding-to-fix-to-evidence map is in `.factory/polish-2.md`.

## Verification

### Clean checkout

Commit `ac7bf0a` was cloned into a new temporary directory.

- `npm ci`: 172 packages installed; 0 vulnerabilities.
- `npm test`: 12 Vitest tests, 6 native package-contract tests, 1 generated-precache test, and 24 Playwright tests passed. Two project-specific tests skipped by design.
- `npm run build`: passed; emitted `dist/` and all route entries.
- Exact non-emulator claim commands: 10 of 10 passed from the registry.
- Exact full registry in the clean API 35 workflow: 15 of 15 passed.

### Android runtime claims

The clean emulator workflow installs `public/downloads/quietwall.apk`, confirms its published checksum, clears app data, grants Android VPN consent, and runs each claim separately.

- `@claim:android-dns-filter`: matching `blocked.example` returned NXDOMAIN with its transaction id intact.
- `@claim:native-privacy`: the blocked flow added no app UID egress; runtime storage contained settings and no browsing database.
- `@claim:network-resolver`: Android exposed a non-VPN resolver and an allowed query returned through Quietwall without local NXDOMAIN.
- `@claim:pause-delay`: the request was blocked before expiry and filtering turned off after expiry.
- `@claim:filter-boundary`: installed package services use VPN authority and have no device-admin permission or service.

Workflow: <https://github.com/B-Divyesh/sf-android-site-blocker-private/actions/workflows/android-debug-apk.yml>

### Browser, accessibility, privacy, and offline

- `one click opens visible sample data in the first mobile viewport` checks CTA entry, focused h1, banner, values, state, and the 844 px boundary.
- `@claim:demo-isolation` preserves a real rule through demo edits/reset/exit.
- `@claim:browser-privacy` observes same-origin requests only and opens `quietwall-demo`, not `quietwall-local`.
- `@claim:offline-demo` reloads the seeded sample after network disable.
- Route tests cover one h1, `lang=en`, main/header/footer landmarks, metadata, title, focus, history, and 0 serious/critical axe violations.
- The mobile test finds no horizontal overflow and no visible target smaller than 44 × 44 CSS px.
- Reduced-motion CSS removes meaningful transition duration.

Evidence:

- `.factory/evidence/demo-mobile-polish-2.png`
- `.factory/evidence/demo-first-viewport-polish-2.png`
- `.factory/evidence/home-desktop-polish-2.png`
- `.factory/evidence/lighthouse-polish-2-local.json`
- `.factory/evidence/lighthouse-polish-2-live.json`
- `.factory/evidence/live-polish-2/verify.json`
- `.factory/evidence/live-polish-2/demo-first-viewport.png`

Local Lighthouse: 100 performance, 100 accessibility, 100 best practices, 100 SEO; LCP 1.2 s; CLS 0.
Live Lighthouse: 100 performance, 100 accessibility, 100 best practices, 100 SEO; LCP 0.9 s; CLS 0.

Production bundles: main JavaScript 32.47 kB raw / 11.80 kB gzip; CSS 17.26 kB raw / 4.53 kB gzip. No font files, third-party scripts, analytics, or runtime API are shipped.

## Run and verify

```sh
npm ci
npm test
npm run build
```

With a booted API 35 emulator and `adb` on PATH:

```sh
npm run cap:sync
node scripts/run-claim-registry.mjs
```

## Deployment and live cold check

Static output was deployed with the work order's `deploy-static.sh android-site-blocker-private dist` path.

- Live root: <https://android-site-blocker-private.sociobot.in>
- Live demo: <https://android-site-blocker-private.sociobot.in/?demo=1>
- Live privacy: <https://android-site-blocker-private.sociobot.in/privacy/>
- Live terms: <https://android-site-blocker-private.sociobot.in/terms/>
- Live 404 check: <https://android-site-blocker-private.sociobot.in/does-not-exist>

Cold desktop and 390 × 844 contexts were checked after deployment for current copy, first-view demo state, reset/exit isolation, titles, focus, routes, same-origin traffic, offline reload, console errors, axe, and 404 status. The sample summary ended at 556.61 px; axe found 0 serious/critical issues; the app made only same-origin requests; non-404 routes logged no console errors; and the product 404 returned HTTP 404.

## Known gaps

None within this work order. The downloadable APK is intentionally labeled a debug-signed preview, not a store release.
