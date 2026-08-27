# Independent verification — Quietwall

**Work order:** `android-site-blocker-private-verify-1`  
**Candidate:** `8b26ff2761245b569d63040021a0446159c10c21`  
**Verified:** 2026-08-27  
**Verdict: FAIL**

The candidate satisfies the PWA-first/Capacitor-skeleton scope in its principal
functional paths, and it does not claim that its web build already blocks
device traffic. It cannot be accepted as-is because keyboard navigation lands
on a clipped, invisible file input. This violates the required visible-focus
keyboard baseline.

## Release-blocking finding

`#import-file` is a visually hidden `<input type=file>` but has the default
`tabIndex` of `0`. Tabbing through the 390 px app produces this sequence:

`#main` → home → `power-button` → `domain` → Add domain → Import →
`import-file` → Commitment controls.

When focused, the input has `clip: rect(0px, 0px, 0px, 0px)` and a 1 px
clipped box, so its otherwise valid focus outline is not visible. The visible
Import button already opens it. Keyboard users therefore encounter an
unannounced, invisible focus stop. This is independently reproducible with:

```js
await page.locator('#import-file').focus()
await page.locator('#import-file').evaluate((e) => ({
  tabIndex: e.tabIndex,
  clip: getComputedStyle(e).clip,
  active: document.activeElement === e
}))
// { tabIndex: 0, clip: 'rect(0px, 0px, 0px, 0px)', active: true }
```

Recommended product fix for a follow-up: remove the file input from sequential
tabbing (`tabindex="-1"`) while retaining the labelled Import button as the
keyboard-accessible control, then re-run keyboard and axe checks. This report
does not make that product change.

## Checks that passed

- Clean install: `npm ci` completed with 0 npm audit vulnerabilities. The
  first `npm test` appropriately reported the missing Playwright browser; after
  `npx playwright install chromium`, the final `npm test` passed: 12 Vitest
  checks and all 10 Playwright checks (five cases on desktop and 390×844).
- `npm run build` passed and emitted `dist/`. `npm run cap:sync` passed and
  synchronized the built shell to `android/app/src/main/assets/public/`.
- Manual Playwright exercise at 390×844 verified the empty list, invalid
  domain error, `*.News.Example.com` normalization/export as
  `*.news.example.com`, IndexedDB persistence after reload, rejected
  unsupported import, valid JSON import, native-confirm remove/Undo, delayed
  one-minute pause (disabled `UNLOCKS IN …` state), and no horizontal overflow.
  The existing 12 unit checks specifically cover overnight 22:00–07:00
  schedule behavior and equal-time all-day behavior.
- With `reducedMotion: 'reduce'`, the power button transition was `1e-05s`.
  Axe found no violations (including no serious or critical violations) on the
  390 px app; page console errors were `[]`.
- After service-worker activation, `context.setOffline(true)` followed by a
  reload retained both the app shell and saved rule. A navigation to an
  uncached route rendered the offline fallback (`Offline — Quietwall`,
  `You’re offline. Good.`) with the compiled stylesheet available.
- A diagnostic copy of `dist/` (not this repository) was served, its `sw.js`
  changed by one comment, and `registration.update()` produced the visible
  `Update ready. Reload` toast with a waiting worker. This validates the
  skip-waiting/update UI flow without modifying product code.
- Network capture of the candidate and live page contained only same-origin
  document/assets/service-worker requests. No analytics, API, CDN, font, or
  third-party request was observed. Live console errors were `[]`.
- The live page has exactly one `h1`, zero axe violations, and visibly states:
  “This work order delivers the installable, offline configurator and
  Capacitor shell. This web build does not claim to intercept device traffic.”
  Source inspection also limits future blocking language to when the Android
  VPN service is active; no false current web/PWA traffic-blocking claim was
  found.
- `/privacy/` and `/terms/` load as real pages with one main heading each.
  Live headers include HSTS, `nosniff`, strict-origin referrer policy, and DNS
  prefetch disabled. Chrome CDP reported no manifest parsing errors. The live
  server labels the manifest `application/octet-stream` rather than
  `application/manifest+json`; Chrome accepted it in this verification, but
  deployment should correct that MIME type.
- Candidate/live byte parity was confirmed for `index.html`, `sw.js`,
  `manifest.webmanifest`, the main JS/CSS, icon, hero image, offline page, and
  both legal pages. Example SHA-256 values: `index.html`
  `72991cc1bced520dbe67e03a852ecf9f7ccd6bd4bd2e714097ef9b7cf2f1bdea`,
  `sw.js` `ba64bed335118384c7740bdddb3130251f0d1a3e9dee8facee6442d1a396f131`.
- Bundles are well below the static budgets: main JS 16,505 B (6.12 kB gzip),
  preload helper 711 B, CSS 13,065 B (3.75 kB gzip), and hero WebP 7,406 B.
  No shipped font files exist.

## Android skeleton/security inspection

- `capacitor.config.ts` and generated config use the required id
  `in.sociobot.androidsiteblockerprivate`; the shell is Capacitor 7 and points
  to `dist`.
- `AndroidManifest.xml` declares no `uses-permission`, no `VpnService`, no
  receiver, and no analytics identifier. `android:allowBackup="false"` is set.
  The only generated provider is non-exported
  `androidx.core.content.FileProvider` with the app-id authority. It has a
  broad `external-path path="."` plus URI-grant capability despite no native
  file/share feature or app code using it. It is not externally exported, but
  should be removed or narrowed before native feature work.
- No keystore, `google-services.json`, or `.env` file is tracked. The Google
  Services Gradle classpath is present but is inert without that JSON file;
  no Firebase runtime artifact or network call was observed.
- Reproducible web inputs are locked (`package-lock.json`) and the Gradle
  wrapper is pinned to 8.11.1. Android compilation/APK assembly was not run:
  this disposable static-deploy environment has neither `java` nor
  `JAVA_HOME`. That is consistent with the work order’s explicitly deferred
  APK; successful Capacitor sync is the applicable native check.

## Limits of this verification

Lighthouse 13.4.1 could not be completed independently in this container. Its
root Chrome launch required `--no-sandbox`; a direct remote-debugging launch
then crashed in Chrome's font-data service with `No space left on device`.
No Lighthouse score is claimed here. Static bundle budgets, browser console,
axe, responsive, offline, and functional checks above were completed.

## Required next action

Fix and verify the keyboard focus defect, then issue a new verification. The
future Android work order must still implement the local `VpnService` DNS
engine, consent/lifecycle/bridge and packet-level no-egress audit; this
candidate intentionally contains only the offline PWA configurator and
Capacitor shell, not an APK or device-wide blocker.
