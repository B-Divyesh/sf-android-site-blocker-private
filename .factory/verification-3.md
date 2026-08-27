# Independent verification 3 — Quietwall

**Verdict: FAIL**

Verified on 2026-08-27 from a clean detached worktree at
`6354ddbc241e22eb24eecf84b2105e468fe40b06` against
`https://android-site-blocker-private.sociobot.in/`.

The candidate builds and its JVM/browser test suites pass, but the deployed PWA
cannot install its service worker. This breaks the required offline reload and
update path in production. The live host otherwise serves the tested candidate
HTML, JS, and CSS byte-for-byte.

## Blocking defect

### High — production service worker never installs

`scripts/finalize-sw.mjs` recursively adds every file in `dist/` to the
service-worker `SHELL`. The generated worker therefore calls `cache.addAll()`
with `/staticwebapp.config.json`. On the live Azure-style static host:

```text
GET /staticwebapp.config.json  -> 404 text/html (2,400 bytes)
GET /_headers                  -> 200
```

`Cache.addAll()` rejects when one response is not OK, so the install event
rejects and the registration is discarded. A clean Chromium 151 context,
three seconds after loading the live home page, reported:

```json
{"controller":false,"regs":[]}
```

Manually calling `navigator.serviceWorker.register('/sw.js')` initially
returned an `installing` worker, then `getRegistrations()` returned zero after
one second. All other generated shell URLs returned 200; the 404 configuration
file is sufficient to reproduce the failure. Consequently, the live app does
not meet the PWA/offline and update requirements. Local Playwright passes only
because Vite preview serves that configuration file.

Required remediation: do not precache deployment-control files (at minimum
`staticwebapp.config.json` and `_headers`), or make every generated precache
URL a successful production response. Re-run fresh-profile live offline and
service-worker-update tests after deployment.

## Quality-gate execution

All commands below ran from the clean worktree unless stated otherwise.

| Check | Result | Evidence |
| --- | --- | --- |
| `npm ci` | PASS | 171 packages installed; npm audit reported 0 vulnerabilities. |
| `npm test` | PASS after installing the declared Chromium browser | 12 Vitest checks and 12 Playwright checks passed. The first attempt correctly failed only because the clean image lacked Playwright's browser executable; `npx playwright install chromium` supplied that test prerequisite. |
| `npm run build` | PASS | `tsc --noEmit`, Vite production build, and service-worker finalization passed. |
| `npm run cap:sync` | PASS | Production web assets copied to the Android Capacitor project. |
| `./gradlew test assembleDebug --no-daemon` | PASS | JDK 21, Android SDK 35/build-tools 35.0.0. 14 JVM checks passed: debug and release each ran 3 DNS packet, 3 rule matcher, and 1 Capacitor example test. |
| Debug APK | PASS as a debug artifact only | `app-debug.apk` is 4,270,025 bytes, SHA-256 `7505e3898eacd038e8f82938860349c695f629a7a5967e280961addd1ffcb277`; `apksigner` verifies v1/v2. Certificate is `CN=Android Debug`, so it is not a release/distribution APK. |
| Lint/type checks | PASS / not separately configured | TypeScript is checked by the exact build command. `package.json` has no lint script. |

## Product exercise

The live app was exercised in fresh desktop (1280x900) and 390x844 mobile
Chromium contexts.

- Normal input `https://www.Example.com` normalized to `example.com`.
- Wildcard `*.news.example.com` was accepted.
- Malformed `not a domain` was rejected with the validation state.
- A malformed JSON import was rejected; subsequent remove confirmation and
  **Undo** restored `example.com`.
- The committed desktop/mobile suite additionally covers IndexedDB persistence,
  keyboard traversal/focus, privacy/terms routes, axe, and local offline reload.
- Fresh live contexts produced no page errors or console errors and made no
  third-party network requests. Live axe found no serious or critical issues on
  either viewport. Under reduced motion, the shield transition was `1e-05s`.

The native VPN/DNS path could not be exercised on a physical Android device or
emulator in this verification environment. The build/JVM tests cover parsing,
matching, malformed DNS and response framing, but they do **not** prove Android
VPN consent, packet relay, NXDOMAIN delivery, boot recovery, or packet-level
network behavior. This remains required before a release claim.

## Deployment parity, privacy, security, and performance

The live root response was HTTP 200 and exactly matched built `dist/index.html`.
The live main JS and CSS exactly matched their built files:

```text
main-O72ZAxUW.js  e405e0c594702249237a2102b1fcd2ffb187e8ae4d02a2eb849fe6b8084d4727
styles-CzWsRddD.css d3abc954adaa09afbfa03e96d6a480e331b47cb334c86b68b49c9dfcb030ba55
```

The host supplies HSTS, CSP (`default-src 'self'`, `connect-src 'self'`,
`frame-ancestors 'none'`), `X-Frame-Options: DENY`, `nosniff`, no-referrer, and
restrictive Permissions Policy. Documents and `sw.js` are no-cache; hashed
assets are immutable for one year. `/privacy/`, `/terms/`, manifest MIME, title,
language, main landmark, single h1, and image alt text are present.

The initial JavaScript is 25.21 kB uncompressed / 9.35 kB gzip and CSS is
13.07 kB / 3.75 kB gzip, both within factory budgets. Mobile Lighthouse was
variable: 89 then 98 performance, both 100 accessibility; LCP was 1.112 s /
1.156 s and CLS 0. The first score misses the stated >=90 performance gate, so
this should be treated as a flaky/non-demonstrated performance gate rather than
a clean pass.

Static code and request inspection found no analytics, advertising, remote API,
CDN script/font, or Quietwall endpoint. The Android service intentionally sends
permitted DNS directly to the current network resolver; this is documented in
the legal text and is not a call to Quietwall, but it means a literal claim of
"zero outbound connections" would be inaccurate. A packet capture on Android
is still needed to substantiate the privacy boundary.

## Defects by severity

1. **High: production PWA service worker installation fails** because the
   precache includes a live 404 configuration file. Offline reload and update
   are unavailable. This is the release-blocking defect.
2. **Medium: native end-to-end network behavior remains unverified.** No
   device/emulator VPN-consent, DNS block/allow, relay, boot, or packet audit
   was completed; unit tests do not replace it.
3. **Low: mobile Lighthouse is not reproducibly >=90** (89 then 98 under the
   same simulated mobile audit).
4. **Low: the home-page description says “no network calls,”** while the native
   implementation necessarily relays permitted DNS to the active resolver and
   the PWA fetches its own update files. The legal page states the accurate
   behavior; the short claim should be made equally precise.

