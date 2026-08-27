# Handoff — independent verification 3

## Status

**FAIL — do not release this candidate.** Independent verification of
`6354ddbc241e22eb24eecf84b2105e468fe40b06` and
`https://android-site-blocker-private.sociobot.in/` found a production-only
PWA failure: its service worker cannot install, so offline reload and update
behavior are unavailable. Full evidence is in
[`verification-3.md`](verification-3.md).

The local static/browser and Android JVM/build checks pass, but that does not
override the live PWA failure or prove real-device DNS filtering.

## Release-blocking correction

`scripts/finalize-sw.mjs` adds `staticwebapp.config.json` to the generated
precache. The deployed host correctly returns that deployment-control file as
404, causing `cache.addAll()` to reject and discard the worker. Exclude
deployment-control files from the precache (or otherwise ensure every listed
URL returns a successful production response), deploy, then rerun a fresh
profile service-worker install/update/offline test against the live URL.

## Verified commands

```sh
npm ci
npx playwright install chromium
npm test
npm run build
npm run cap:sync
cd android
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 \
ANDROID_HOME=/tmp/quietwall-android-sdk \
ANDROID_SDK_ROOT=/tmp/quietwall-android-sdk \
./gradlew test assembleDebug --no-daemon
```

Results: 12 Vitest + 12 Playwright checks pass; production build passes; 14
Android JVM checks pass in debug/release; debug APK SHA-256 is
`7505e3898eacd038e8f82938860349c695f629a7a5967e280961addd1ffcb277` and v1/v2
signatures verify. It is signed with the Android Debug certificate and is not a
release artifact.

## Remaining before a PASS

- Verify the corrected service worker on the live host: initial installation,
  offline reload with saved state, and a version update with Reload toast.
- On a physical Android device/emulator, verify VPN consent/cancel, actual
  blocked NXDOMAIN, allowed resolver relay, schedules/delayed pause/boot, other
  VPN behavior, and packet capture proving no Quietwall endpoint/telemetry.
- Obtain a stable mobile Lighthouse result at or above 90 performance (the two
  live runs were 89 and 98; accessibility was 100 in both).

## Original builder delivery (subject to the failed verification above)

## Delivered

- Added `QuietwallVpnService`, declared as Android's `VpnService` with explicit VPN consent, a low-priority foreground notification, `START_NOT_STICKY` lifecycle, and no analytics/telemetry code.
- The service supplies local IPv4 (`10.99.0.2`) and IPv6 (`fd51:7177:616c:6c00::2`) DNS addresses to Android. It bounds-checks unfragmented UDP DNS packets, including IPv6 extension/fragment parsing, replies NXDOMAIN locally for a matching rule, and relays allowed queries only to resolvers advertised by the active non-VPN network. `VpnService.protect()` excludes that relay socket from the VPN loop.
- Added native domain validation and matching. A bare `example.com` matches the apex and descendants; `*.example.com` matches descendants but not the apex. The Capacitor `QuietwallVpn` plugin syncs only enabled rule patterns plus schedule/unlock state from the existing PWA UI. It does not expose DNS activity to JavaScript.
- The consent cancellation path disarms native and web state. A delayed pause is also scheduled natively, so it can stop the VPN after the WebView closes. Boot recovery runs only after `BOOT_COMPLETED` and only when the private native setting says the user left protection enabled; an expired delayed pause is disarmed instead.
- Updated the preserved UI and legal copy to describe the real Android engine and the browser/PWA boundary honestly. The PWA remains an offline local configurator; it cannot itself filter traffic.
- Added deterministic JVM tests for matching, malformed DNS input, IPv4/IPv6 UDP parsing, DNS NXDOMAIN construction, and response framing.
- Added GitHub Actions at `.github/workflows/android-debug-apk.yml`: Java 21, `npm run cap:sync`, `./gradlew test assembleDebug`, SHA-256 creation, and APK/checksum upload. Android debug artifacts are debug-key signed by the Android toolchain (there is no production/release key in this repo); the workflow intentionally performs no release signing.
- Added static production configuration in `public/staticwebapp.config.json` and `public/_headers`: immutable one-year caching for `/assets/*`, no-cache documents/service worker, restrictive CSP with `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, Referrer/Permissions Policy, and `application/manifest+json` for `.webmanifest`.

## Local verification (2026-08-27)

```sh
npm ci
npm test
npm run cap:sync
cd android
ANDROID_HOME=/opt/quietwall-android-sdk ANDROID_SDK_ROOT=/opt/quietwall-android-sdk ./gradlew test assembleDebug --no-daemon
```

- `npm test`: **PASS** — 12 Vitest checks and 12 Playwright checks (desktop + 390 px), including IndexedDB persistence, offline reload, keyboard traversal, and axe serious/critical violations.
- `npm run build`: **PASS**. Final main JS is 25.21 kB uncompressed / 9.35 kB gzip and CSS is 13.07 kB / 3.75 kB gzip, within the static budget. `dist/` contains the static header config and versioned PWA shell.
- `./gradlew test assembleDebug`: **PASS** with JDK 21, Android SDK Platform 35, and Build Tools 35.0.0. The six Quietwall native test cases pass in both debug and release test variants (the generated Capacitor example test also passes).
- Local artifact: `android/app/build/outputs/apk/debug/app-debug.apk`, 4,306,234 bytes, SHA-256 `c9dabd891d72b605a0181c8196d0401755c1ee7423426e8f4b91621f195bfb37`.
- `apksigner verify --verbose` reports valid v1/v2 signatures with the generated **Android Debug** certificate. No release signing key was used or committed.
- Static header JSON was parsed locally and contains both the manifest MIME mapping and `frame-ancestors 'none'` CSP directive. A deployed host must publish the generated `dist/` root, including `staticwebapp.config.json` (Azure Static Web Apps) or `_headers` (compatible host), for these headers to take effect.

## Important limitations / remaining verification

- This is a DNS commitment tool, not parental control. Android permits one VPN at a time: another VPN replaces Quietwall. Android Private DNS, an app using its own resolver (including DoH/DoT), TCP-only DNS, direct IP connections, and uninstalling the app can bypass or fall outside this filter. These limitations are shown in the product and terms.
- Only ordinary **UDP DNS** is intentionally handled. The engine does not claim to intercept encrypted or TCP DNS. A failed/absent network resolver causes allowed DNS to fail rather than fall back to a Quietwall service.
- Quietwall stores filtering configuration locally but deliberately stores no query, response, domain-match, IP-address, counter, analytics, crash-report, or browsing-history record. Permitted DNS necessarily travels to the resolver selected by the current Wi-Fi/mobile network; it never travels to a Quietwall server.
- No physical Android device/emulator was available for packet capture in this worker. Before release, verify on IPv4-only, IPv6-only, and dual-stack Android networks that the VPN consent screen, foreground notification, blocked NXDOMAIN, allowed resolver relay, schedule/unlock expiry, boot recovery, other-VPN conflict, and Private DNS/DoH warnings behave as documented. Perform a packet-level audit confirming no Quietwall endpoint is contacted.
- The APK is a locally built debug artifact only, not a distributable release. CI uploads an equivalent debug artifact and checksum; production signing, artifact distribution, and static deployment remain factory actions.

## Run / deploy

```sh
npm ci
npm test
npm run cap:sync
cd android && ./gradlew test assembleDebug
```

Use JDK 21 and Android Platform 35 / Build Tools 35.0.0 for Gradle. Deploy the generated `dist/` directory as the static root without dropping `staticwebapp.config.json` or `_headers`. Do not present the static site alone as a working blocker; install the Android APK and accept Android VPN consent to enable filtering.
