# Independent verification 2 — Quietwall

**Work order:** `android-site-blocker-private-verify-2`
**Tested candidate:** `af8fcb743f6b70a5d3697dbdf76c27871ba252e3` (`main`)
**Tested deployment:** <https://android-site-blocker-private.sociobot.in/>
**Verified:** 2026-08-27
**Verdict: FAIL**

The live deployment exactly matches the candidate PWA, and its PWA
configurator paths are polished and testable. It does **not** meet the
researched product's smallest useful product or the factory definition of done:
there is no Android `VpnService` DNS interceptor, hence no device-wide domain
blocking. It is a local block-list configurator in a Capacitor shell, not an
Android website blocker.

## Release blockers

### Critical — the core Android blocking capability is absent

The researched brief requires an Android app with a local `VpnService` DNS
interceptor which blocks a user-managed domain list device-wide. The candidate
cannot perform that job:

- `android/app/src/main/AndroidManifest.xml` declares only the launcher
  activity and a non-exported `FileProvider`; it has no `VpnService`, no
  `android.permission.BIND_VPN_SERVICE`, and no VPN-related declaration.
- `MainActivity.java` is solely `class MainActivity extends BridgeActivity {}`.
  Repository search found no `VpnService`, DNS interception, packet handling,
  or Android-to-WebView rule bridge.
- The app itself states that “Android VPN engine is the next native build
  step.” This is honest product copy, but confirms the missing capability.
- The candidate includes no APK and, prior to `npm run cap:sync`, no bundled
  web assets under `android/app/src/main/assets/public/`. Capacitor sync does
  successfully create those ignored build assets, but it does not create a
  blocker.

Consequently, the claimed real job-to-be-done and the brief's zero-outbound
**app** network audit cannot be verified. Browser/PWA network behavior is not
evidence for a future native VPN implementation.

## Other defects found on the live deployment

### Medium — immutable asset caching is not configured

Every sampled URL, including hashed JS and CSS, returns
`cache-control: public, must-revalidate, max-age=30`. The README and factory
performance contract call for long-lived immutable caching of hashed assets.
This is a deployment configuration defect, not a candidate/source mismatch.

### Medium — missing clickjacking/content restrictions

The live responses have HSTS, `nosniff`, and a strict-origin referrer policy,
but no `Content-Security-Policy` (including `frame-ancestors`), no
`X-Frame-Options`, and no `Permissions-Policy`. The app can therefore be
framed by another origin. Add a restrictive CSP (with `frame-ancestors 'none'`
or an equivalent explicit policy), anti-framing protection, and an appropriate
Permissions Policy at deployment.

### Low — manifest has an incorrect MIME type

`/manifest.webmanifest` is served as `application/octet-stream`, rather than
`application/manifest+json` (or JSON). Chromium accepted it in this check, but
the deployment should serve the standard manifest MIME type for interoperable
PWA installation.

## What was verified successfully

- Clean checkout confirmed at the tested SHA. `npm ci` completed with 0 known
  npm audit vulnerabilities. The initial browser test invocation correctly
  exposed the clean container's missing Playwright browser; after
  `npx playwright install chromium`, the required exact command `npm test`
  exited **0**: 12 Vitest checks passed, TypeScript was checked through the
  build, production `dist/` was emitted, and all 12 Playwright checks passed
  (desktop plus 390×844 mobile).
- There is no lint script. `npm run build` and `npm run cap:sync` also passed.
  Native `./gradlew test assembleDebug` could not start because this disposable
  static-deploy environment has neither `java` nor `JAVA_HOME` (nor an Android
  SDK); this is recorded as an environment limitation, not a passing APK test.
- Representative manual browser exercise on the production build covered a
  normalized wildcard (`*.News.Example.com.`), invalid domain feedback,
  duplicate handling, malformed and unsupported-version JSON import feedback,
  a valid two-rule import, 1,440-minute delay clamping, export, cancel/remove/
  Undo recovery, IndexedDB persistence, and no 390px horizontal overflow.
  A full URL with a port currently normalizes to its hostname (for example,
  `http://example.com:8080` becomes `example.com`); that is current behavior,
  despite UI help that asks users to omit ports.
- Direct live browser checks at 1440×900 and 390×844 found one `h1`, no page
  errors or console errors, no horizontal overflow, and no axe serious or
  critical violations. Keyboard-only traversal found every sequential stop
  visible with a 3px focus indicator; the hidden import input is not in the
  tab order. Reduced-motion power-control transition duration was `1e-05s`.
- The candidate PWA and live site registered a controlling service worker. On
  the live 390px site, a saved `offline-verification.example` rule and the app
  shell survived `context.setOffline(true)` plus reload, with
  `OFFLINE · RULES AVAILABLE` shown and no errors. Against an isolated,
  unmodified copy of `dist/`, serving a changed `sw.js` made the in-app
  **Update ready / Reload** toast appear; Reload activated the waiting worker.
- Static inspection plus network capture found no automatic third-party,
  analytics, API, CDN, font, telemetry, or advertising requests. Runtime
  requests were same-origin documents, assets, and service-worker resources.
  The footer's GitHub source link is a user-initiated navigation, not an
  automatic request. Rules are stored in IndexedDB and exported locally.
- `/privacy/` and `/terms/` are present static routes. The candidate contains
  no tracked keystore, `google-services.json`, `.env`, or obvious credential
  file. The manifest sets `android:allowBackup="false"`; its FileProvider is
  non-exported. (Its broad `external-path path="."` should still be removed or
  narrowed when native file features are added.)
- The built payload is 70,299 bytes total. All JS is 21,746 bytes uncompressed
  (main 16,519 bytes / 6.13 kB gzip), CSS is 13,065 bytes / 3.75 kB gzip, and
  the hero WebP is 7,406 bytes: comfortably within the stated static budgets.
- Candidate/live parity was verified by SHA-256 for `index.html`, `offline.html`,
  `manifest.webmanifest`, `sw.js`, privacy and terms pages, all delivered JS
  and CSS chunks, and the icon/hero assets. For example, both live and local
  `index.html` hash to
  `2fb244406d487cc8f69490489747774446b670266dbaecc74beb1313e048ec14` and
  both `sw.js` hash to
  `4773d7efda94034761e1fda5321c0e72671d2dc19514a4a2ff45e1602b0e882d`.

## Required next action

Implement, package, and device-test the local Android `VpnService` DNS
interceptor before presenting Quietwall as an Android website blocker. That
work must include VPN consent and lifecycle, rule synchronization, IPv4/IPv6
DNS behavior, wildcard matching, foreground notification/recovery, conflict
and DoH limitation guidance, an APK build, and packet-level proof that the app
makes no outbound connection. Then correct the live cache, CSP/anti-framing,
and manifest MIME configuration and issue another independent verification.
