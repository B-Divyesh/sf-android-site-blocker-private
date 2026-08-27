# Quietwall

Quietwall is a local Android website blocker for people who want a plain domain list, optional focus hours, and a self-imposed delay before pausing—without an account, tracking SDK, subscription, or hosted DNS provider.

The Capacitor Android app uses Android's `VpnService` after explicit system consent. It directs ordinary UDP DNS through two local VPN addresses, answers a matching domain with NXDOMAIN on-device, and forwards allowed DNS only to the resolver supplied by the current Wi-Fi/mobile network. It does not use a Quietwall resolver, account, analytics endpoint, telemetry SDK, DNS log, or browsing-history database. Rules, schedules, and the delayed-unlock setting are copied from the offline PWA UI to private Android storage so filtering can continue when the WebView is closed.

The website/PWA remains the same local-first configurator: it stores rules in IndexedDB, works offline after installation, and supports versioned JSON import/export. A browser cannot intercept device DNS, so only the Android APK performs device-level filtering. Quietwall is commitment software, not parental control.

## Run locally

Requirements: Node.js 20 or newer. Android builds additionally require JDK 21 and Android SDK Platform 35 / Build Tools 35.0.0.

```sh
npm ci
npm run dev
```

Vite prints the local development URL. No runtime service, database server, secret, or environment variable is needed.

## Test and build

```sh
npm test
npm run build
```

`npm test` runs domain/state unit checks, creates a production build, then runs the Chromium end-to-end suite at desktop and 390 px. The browser suite covers local persistence, validation/error states, accessibility with axe, static legal routes, and offline reload with saved data. Playwright’s Chromium is installed with `npx playwright install chromium` if it is not already available.

The exact production command is `npm run build`. Static output lands in `dist/` with `dist/index.html` at its root.

## Android APK and native DNS service

The Capacitor project uses app id `in.sociobot.androidsiteblockerprivate` and lives in `android/`.

```sh
npm run cap:sync
cd android && ./gradlew assembleDebug
```

Run the native tests as part of the build:

```sh
cd android && ./gradlew test assembleDebug
sha256sum app/build/outputs/apk/debug/app-debug.apk
```

The resulting `app-debug.apk` is a debug artifact signed by Android's generated debug certificate, never a production/release key; the GitHub Actions workflow uploads it together with a SHA-256 file. Release signing is intentionally outside this repository.

When the user presses **ARM RULES** in the Android APK, Android presents the standard VPN consent screen. A persistent low-priority system notification confirms that the local DNS service is running. The service is `START_NOT_STICKY`; it is restored after a reboot only when the user left protection armed. Cancelling the consent dialog leaves the rule set paused.

### What native filtering does and does not do

- Bare domains match themselves and all subdomains. `*.example.com` matches subdomains but not the apex.
- IPv4 and IPv6 UDP DNS packets are bounds-checked, including IPv6 extension/fragment handling. The VPN sends blocked queries a locally generated NXDOMAIN and relays permitted queries to the active network's advertised resolver with the socket excluded from the VPN loop.
- Android supports one active VPN. Starting another VPN disconnects Quietwall. Android Private DNS, an app using its own resolver (including DoH/DoT), TCP-only DNS, direct IP URLs, and uninstalling the app can bypass or fall outside this DNS filter.
- No DNS queries, rule matches, IP addresses, counters, crash reports, or analytics leave Quietwall. Permitted DNS still necessarily goes to the DNS resolver chosen by the current network.

## Privacy and data ownership

There are no analytics, advertisements, Quietwall remote APIs, CDN assets, external fonts, or user accounts. Rules and settings remain in browser IndexedDB and, for the Android VPN, private app storage. Export creates a local JSON file. The service deliberately writes no DNS or browsing logs. See `/privacy/` and `/terms/` in the app.

## Deploy

Publish the contents of `dist/` at `https://android-site-blocker-private.sociobot.in`. `dist/staticwebapp.config.json` configures immutable caching for hashed JS/CSS, no-cache for documents and the service worker, CSP/anti-framing headers, and `application/manifest+json` for the manifest. `dist/_headers` provides the same headers for compatible static hosts. The service worker precaches the versioned app shell and updates through an in-app reload notice.

## License

MIT. See [LICENSE](LICENSE).
