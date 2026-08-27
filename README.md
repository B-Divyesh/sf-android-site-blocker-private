# Quietwall

Quietwall is the local-first configurator for a tiny Android website blocker that never phones home. It is for people who want a plain domain list, optional focus hours, and a self-imposed delay before pausing—without an account, tracking SDK, subscription, or hosted DNS provider.

The current work order ships the production PWA and a Capacitor Android project. It stores rules in IndexedDB, works offline after installation, and supports versioned JSON import/export. The browser build is intentionally honest: it configures and preserves rules but cannot intercept device DNS by itself. A later native build will add the Android `VpnService` DNS engine. Quietwall is commitment software, not parental control.

## Run locally

Requirements: Node.js 20 or newer.

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

`npm test` runs 12 domain/state unit checks, creates a production build, then runs the Chromium end-to-end suite at desktop and 390 px. The browser suite covers local persistence, validation/error states, accessibility with axe, static legal routes, and offline reload with saved data. Playwright’s Chromium is installed with `npx playwright install chromium` if it is not already available.

The exact production command is `npm run build`. Static output lands in `dist/` with `dist/index.html` at its root.

## Android shell

The Capacitor project uses app id `in.sociobot.androidsiteblockerprivate` and lives in `android/`.

```sh
npm run cap:sync
cd android && ./gradlew assembleDebug
```

An Android SDK is required for the Gradle step. Do not publish this shell as a blocker until the native `VpnService` DNS engine and its network audit are complete.

## Privacy and data ownership

There are no analytics, advertisements, remote APIs, CDN assets, external fonts, or user accounts. Rules and settings remain in browser IndexedDB. Export creates a local JSON file. See `/privacy/` and `/terms/` in the app.

## Deploy

Publish the contents of `dist/` at `https://android-site-blocker-private.sociobot.in`. The service worker precaches the versioned app shell and updates through an in-app reload notice. Configure immutable caching for hashed files in `dist/assets/` and no-cache for `index.html` and `sw.js`.

## License

MIT. See [LICENSE](LICENSE).
