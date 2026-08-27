# Handoff — Quietwall v1 PWA

## Independent verification 2 — FAIL (2026-08-27)

**Tested candidate:** `af8fcb743f6b70a5d3697dbdf76c27871ba252e3`
**Tested URL:** <https://android-site-blocker-private.sociobot.in/>

**FAIL.** The deployed PWA matches the candidate and passes its web
functional, offline, responsive, keyboard, axe, console, and bundle checks.
It is nevertheless not the product specified by the researched brief: the
Android project has no `VpnService` DNS engine, no VPN declaration, and no APK
implementing device-wide domain blocking. It is only a Capacitor/PWA block-list
configurator. Do not release it as an Android website blocker.

The exact independent evidence and severity-ranked defects are in
[`verification-2.md`](verification-2.md). Required remediation is: build and
device-audit the local VPN/DNS blocker, then correct the production immutable
caching, CSP/anti-framing headers, and manifest MIME type before a fresh
verification. Android Gradle assembly was attempted but this static-deploy
verification image has no Java/JDK or Android SDK; `npm run cap:sync` does pass.

## Repair verification status — locally PASS; deployment pending (2026-08-27)

This repair removes the release-blocking invisible keyboard stop: the hidden
`#import-file` now has `tabindex="-1"`, while the visible, named Import button
continues to activate its native file chooser. A Playwright regression tabs
through the real rendered order on desktop and 390×844 mobile, checks every
focused stop has a rendered 3 px focus outline, asserts that `import-file` is
absent, and verifies Enter on Import opens the chooser.

`npm ci`, `npm test`, and `npm run cap:sync` all passed for this repair. The
test run contains 12 unit/browser cases across desktop and mobile, including
the existing offline and axe checks; the production build emits `dist/` and
Capacitor copies it into the Android shell.

The public URL was also checked at 2026-08-27 19:26 UTC. It responds normally
with one `h1`, no serious/critical axe findings, and no console errors, but is
still serving pre-repair `main-Dlmg_Ldc.js`: its `#import-file` has
`tabIndex: 0`. This worker cannot publish static deployment changes. Deploy
this commit's `dist/`, then re-check that production has `tabIndex: -1` before
calling the release live PASS. [`verification.md`](verification.md) remains the
record of the prior independent failure.

## Delivered

- Built a production Vite + vanilla TypeScript PWA under the Quietwall name with the required original pixel/demoscene control-room visual system.
- Implemented validated domain and wildcard rules, per-rule enable/disable, specific delete confirmation with undo, IndexedDB persistence, JSON import/export, all-day or overnight focus hours, and an optional 0–1,440 minute delayed pause.
- Covered the empty, invalid input, storage error, offline, update-available, scheduled, paused, and active UI states. All controls are keyboard-operable with 44 px targets and visible focus.
- Added a hand-written, versioned service worker that precaches the complete hashed build, uses same-origin cache-first assets and network-first navigation, removes old caches, and exposes an in-app update action.
- Added an install manifest with normal and maskable icons, branded splash treatment, `/privacy/`, `/terms/`, offline fallback, robots and sitemap files, and no analytics, accounts, CDN assets, remote API, or third-party runtime code.
- Added the Capacitor 7 Android project (`in.sociobot.androidsiteblockerprivate`), synchronized production web assets, generated original Android icons/splashes, disabled Android cloud backup, and left the configurator shell with no Android permissions.
- Documented scope, usage, deployment, visual tokens, provenance, and limitations in `README.md` and `.factory/design.md`.

## Verification

- `npm test`: passes. This runs 12 Vitest unit checks, `npm run build`, then 12 Playwright checks across desktop Chromium and a 390×844 mobile viewport.
- Playwright verified domain normalization, error handling, IndexedDB persistence after reload, offline app-shell reload with saved rules, privacy/terms routes, the repaired real Tab order and Import keyboard activation, and zero serious or critical axe violations. No console errors occurred in the smoke path.
- `npm run build`: passes reproducibly and creates `dist/index.html`. Final JS is 16.51 kB uncompressed / 6.12 kB gzip for the main bundle (plus a 0.71 kB Vite preload helper); CSS is 13.07 kB / 3.75 kB gzip; hero WebP is 7.3 kB. All are well inside the 200/50/300 kB budgets.
- Lighthouse mobile against the production preview: Performance **98**, Accessibility **100**, Best Practices **100**, SEO **100**; LCP **1,054 ms**, CLS **0**, total blocking time **168 ms**. Transfer attributed to JS: 7,522 bytes; CSS: 4,116 bytes.
- `npx cap sync android`: passes and places the current production build at `android/app/src/main/assets/public/index.html`.
- `npm audit`: 0 known vulnerabilities (including development dependencies).
- Visual inspection completed at 1440 px and 390 px. Content remains readable, controls stack intentionally, and nothing clips horizontally.

## Known gaps / honest deviation

- This static work order intentionally stops at the PWA plus Capacitor shell, per orchestrator direction. A web page cannot intercept device DNS, and the Android project does **not** yet contain the native `VpnService` DNS engine. The UI says this directly and never claims that browser-configured rules currently block traffic. Therefore no APK is presented as a working blocker.
- The next Android work order must implement and test the local DNS interceptor, wildcard matching in the service, VPN consent flow, foreground-service lifecycle/notification, app-to-native configuration bridge, boot recovery, IPv4/IPv6 handling, Chrome/DoH limitation guidance, and a packet-level zero-egress audit. It should then add only the Android declarations genuinely required by `VpnService`, build/sign the APK, publish its SHA-256, and run device accessibility/back-gesture tests.
- The required `/opt/fleet/lib/gen-image.sh` command was attempted three times after the stated retry windows, but Azure returned `RateLimitReached` each time. The coherent fallback is an original hand-authored SVG pixel scene, optimized to a 7.3 kB WebP. The exact attempted prompt and provenance are recorded in `.factory/design.md` and `assets/src/quietwall-gate.json`.
- Android Gradle/APK compilation was not run because this static-deploy worker does not expose an Android SDK, as anticipated by the attached Android contract. The generated Gradle project and synced web assets are ready for the later Android worker.

## Run / deploy

```sh
npm ci
npm test
npm run build
```

Deploy `dist/` as the static root. For the next native job, run `npm run cap:sync` before the Android Gradle build.
