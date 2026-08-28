# Quietwall — block websites privately on Android

Quietwall blocks selected domains through a local Android DNS VPN. It has no account, subscription, analytics client, or company-run DNS service.

The website prepares and exports a block list. It cannot block browser or device traffic.

## Try the isolated demo

Open `/?demo=1` or select **Try it with sample data** on the first screen.

The sample includes four domains, overnight focus hours, and a 15-minute pause delay. Demo changes use the separate `quietwall-demo` IndexedDB database.

**Reset demo** restores the sample. **Start for real** returns to the separate `quietwall-local` database.

## Run locally

Use Node.js 20 or newer.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite.

## Test and build

```sh
npm test
npm run build
```

The test command runs unit, native-contract, service-worker, desktop, mobile, accessibility, privacy, and offline checks. The build command writes the static site to `dist/`.

Each public product claim and its clean-state command lives in `.factory/claims.json`.

## Android app

The repository includes a Capacitor Android project with app id `in.sociobot.androidsiteblockerprivate`.

The Android app asks for VPN permission before blocking starts. Matching standard DNS requests receive a local not-found response.

Bare domains include their subdomains. An explicit wildcard such as `*.example.com` excludes the apex domain.

Focus hours support daytime, overnight, and all-day ranges. A pause delay keeps filtering active until its timer ends.

Allowed DNS requests use the active network resolver outside the VPN loop. Quietwall stores settings in private app storage and writes no browsing log.

Quietwall filters standard UDP DNS only. Encrypted DNS, direct IP traffic, another VPN, or uninstalling the app can bypass it.

The website provides the signed preview APK and its SHA-256 checksum. The preview uses Android’s generated debug certificate, not a release-store key.

The native sync removes the website-only download directory so an APK never embeds an older APK.

To rebuild it, use JDK 21 and Android SDK Platform 35 with Build Tools 35.0.0.

```sh
npm run cap:sync
cd android
./gradlew test assembleDebug
```

## Privacy and data ownership

The browser stores the real list in `quietwall-local`. The isolated sample uses `quietwall-demo`.

Quietwall has no account or analytics endpoint. Export downloads a versioned JSON file that you control.

Read the in-product [privacy page](https://android-site-blocker-private.sociobot.in/privacy/) and [terms](https://android-site-blocker-private.sociobot.in/terms/).

## Deploy

Publish `dist/` to the configured static host. Do not deploy infrastructure from this repository.

## License

Quietwall is free software under the [MIT License](LICENSE).
