# Independent verification 4 — Quietwall

## Verdict: PASS

**Candidate:** `ce7b9faa7fb5aa40cab7f682bcafc6277d32cb6c` (`docs: record repaired release verification`)

**Live URL:** https://android-site-blocker-private.sociobot.in

**Date:** 2026-08-27 UTC

This was a fresh, independent clean-checkout verification. The earlier
deployment-only failure is no longer present: the live site is byte-identical
to the candidate's generated application shell and its service worker installs
without trying to precache Azure deployment-control files.

## Quality gates

| Check | Result | Evidence |
| --- | --- | --- |
| Clean install | PASS | `npm ci`: 171 packages installed; `npm audit` reported 0 vulnerabilities. |
| Type check and exact web production build | PASS | `npm run build` ran `tsc --noEmit`, Vite, and `scripts/finalize-sw.mjs` successfully. There is no separate lint script in `package.json`. |
| Repository test suite | PASS | After installing the declared Chromium dependency, `npm test` passed: 12 Vitest tests, generated-precache Node test, and 12 Playwright cases (desktop and 390 px). The initial run could not launch because Chromium was absent; it was rerun after `npx playwright install chromium` and passed. |
| Android sync, unit tests, and APK | PASS | `npm run cap:sync`, then `./gradlew clean test assembleDebug --no-daemon` with JDK 21 / Android Platform 35 completed. 9 JVM tests passed in each debug and release variant (18 total); debug APK SHA-256: `add3146a2c4bce7f41045dfe8738faf0fffe9ccc8a6a902be20d9db993d65b35`. |
| Generated precache regression | PASS | Generated `dist/sw.js` cache is `quietwall-shell-e4be3ffd91`; its exact shell excludes `staticwebapp.config.json`, `_headers`, and `sw.js`. |

## Product and PWA exercise

Independent Playwright checks against the generated build covered:

- Empty arm request gives a recovery error; invalid path input is rejected.
- URL input normalizes to `example.com`; wildcard rule creation, persistence,
  arm/pause, 390 px layout, and JSON export work.
- A delay value of `1441` clamps to the documented maximum `1440`.
- Remove confirmation plus Undo works. A malformed import reports an error;
  a valid version-1 import replaces the rules and renders `import.example`.
- Optional overnight schedule (`22:00`–`07:00`) persists after reload. Native
  unit tests also cover normal/overnight schedule policy and delayed-pause
  expiry.
- Persisted state survived an offline reload after the worker controlled the
  page (`offline-qa.example` remained visible).
- A controlled two-version local worker rollout made two worker requests and
  observed `{ active: true, waiting: true, toast: true }`; the in-app
  **Update ready / Reload** path works.

## Accessibility, responsive UI, and performance

- Existing fresh suite axe checks found **0 serious/critical** violations in
  desktop and 390 px profiles. Independent live checks found one `<h1>`, one
  `<main>`, `lang="en"`, the expected title, and no browser console/page
  errors in either profile.
- Keyboard suite verifies the skip link, visible 3 px focus outline, hidden
  file input exclusion, and keyboard activation of Import. At 390 px the
  primary button measured 305 × 48 CSS px with no horizontal overflow.
- `prefers-reduced-motion: reduce` changes control transition duration to
  `0.01ms` as intended.
- Visual inspection of fresh desktop and 390 px captures confirmed the
  product-specific pixel control-room hierarchy, legible mobile copy, and no
  fixed-content overlap.
- Raw emitted budgets: main JS 25,274 B (9,360 B gzip), CSS 13,065 B
  (3,750 B gzip), hero WebP 7,406 B. All are within the stated budgets.
- Fresh simulated-mobile Lighthouse produced **90 performance / 100
  accessibility**, FCP 1.0 s, LCP 1.1 s, CLS 0. Lighthouse then reported a
  `TARGET_CRASHED` while collecting its full-page screenshot; the scored
  metrics and all browser smoke tests completed, so this is recorded as an
  environment/tooling caveat rather than a page error.

## Privacy, policies, and deployment

- Browser request capture on the public desktop and 390 px pages contained
  only `https://android-site-blocker-private.sociobot.in`; no third-party
  script, font, analytics, API, or telemetry request appeared. Static source
  scan found no telemetry SDK or remote endpoint. The GitHub source link is a
  user-initiated footer link, not a loaded resource.
- The native service code only relays permitted DNS to resolvers supplied by
  the active network and has no Quietwall endpoint, DNS log, or analytics
  path. Native packet/rule tests cover malformed packets, IPv4/IPv6 framing,
  NXDOMAIN creation, bare-domain/subdomain matching, and wildcard matching.
- APK inspection confirms app id `in.sociobot.androidsiteblockerprivate`, min
  SDK 23, target SDK 35. Its manifest declares `INTERNET`, foreground-service
  support, and boot recovery in addition to the VPN service. These are normal
  install-time Android capabilities; the only user-facing consent flow is the
  platform VPN consent. This is transparent for the brief's “no permissions
  beyond VPN” intent, but a literal interpretation of that phrase should note
  these declarations.
- Live headers match policy: self-only CSP including `connect-src 'self'`,
  `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, and a
  restrictive Permissions-Policy. HTML is `no-cache`, `sw.js` is
  `no-cache, no-store, must-revalidate`, and hashed assets are
  `public, max-age=31536000, immutable`.
- Hashes of live `/`, `/sw.js`, `/manifest.webmanifest`, main JS, CSS, and
  hero WebP exactly equal `dist/`. The host returns `/staticwebapp.config.json`
  as 404, which is correct and proves the repaired precache no longer tries to
  cache it.

## Defects by severity

- **Critical:** none.
- **High:** none.
- **Medium:** none.
- **Low:** none.

## Coverage limitation / next check

No Android emulator or physical device was attached. The APK was compiled and
its deterministic JVM DNS/policy suite passed, but a device validation should
still observe VPN consent accept/cancel, an actual blocked NXDOMAIN, allowed
resolver relay, another-VPN replacement, and packet-level absence of telemetry
at runtime. This is an environment coverage gap, not evidence of a candidate
failure.
