# Adversarial first-read review 1 — Quietwall

**Verdict: FAIL**  
**Reviewed:** 2026-08-28 UTC  
**Live URL:** <https://android-site-blocker-private.sociobot.in>  
**Candidate:** `7007276bc6695171adef896cf05724de666cc234`

There are 84 findings. Five are blocking. The product has no first-screen
action, no demo, no public install path, and a web control that reports rules
as armed even though the website cannot block traffic. No claim is registered
or tested through `.factory/claims.json`.

## Cold first read

Fresh Chromium contexts were opened at 390 × 844 and 1440 × 900. Nothing was
scrolled before answering:

- What does it do? It appears to keep a private domain block list and use an
  Android-local VPN/DNS filter.
- For whom? Android users who want self-imposed website blocking without an
  account or browsing log.
- What should I click first? This cannot be answered. Neither first screen has
  an action.

### Blocking findings

#### F-1-1 — No first action on either first screen

**Location/quote:** home hero: “Your block list. Nobody else’s business.” and
“A plain domain wall designed to run on your Android device.” At both tested
widths, the hero contains copy and artwork but no link or button.

**Why this fails:** a first-time visitor cannot tell whether to install an app,
configure a list, or try a sample. The headline is a privacy slogan rather than
the job, and the audience is only implied by “Android.”

**Concrete fix:** use `Block websites across your Android device` as the h1,
follow it with `For Android users who want private, device-wide blocking
without an account or subscription.`, and show `Try it with sample data` plus
an adjacent `Download the Android app` action and a one-line outcome for each.

#### F-1-2 — The required one-click demo does not exist

**Location/quote:** there is no “Try it with sample data” action. A direct GET
to `/demo` returns HTTP 404 and Azure’s generic “We couldn’t find that page.”
Repository search found no `/demo`, `?demo=1`, `demo:` storage prefix,
`Reset demo`, `Start for real`, `.factory/demo.md`, or sample records.

**Why this fails:** no visitor or verifier can see realistic rules in use in
one click. There is no demo banner, reset, exit, offline sample, or separate
storage namespace. The only observed IndexedDB database is the real
`quietwall-local` database, so demo isolation cannot be confirmed.

**Concrete fix:** add `/demo` with realistic enabled and paused domain rules,
focus hours, and an unlock delay already visible. Persist only under a
`demo:`-specific database, show `Demo — sample data, nothing is saved`, provide
working `Reset demo` and `Start for real`, preserve real data unchanged, ship a
3–5 frame Android walkthrough, and document it in `.factory/demo.md`.

#### F-1-3 — The browser says rules are armed when nothing is blocked

**Location/quote:** home workbench button/status: “ARM RULES” → “RULES ARMED.”
Later copy admits: “This website keeps the same offline list but cannot itself
intercept device traffic.” The live page has no APK download link. GitHub has
no release; only temporary, login-gated debug workflow artifacts exist.

**Why this fails:** the main visible interaction reports the core outcome
without producing it. A visitor can reasonably believe a site is blocked when
only a boolean was saved. The actual Android product cannot be installed from
the product site.

**Concrete fix:** on the web, label the action `Save block list` and show
`Saved for import; this browser is not blocking sites`. Add a signed public APK
or store install action. Reserve `Start blocking` / `Blocking is on` for the
native app after Android VPN consent succeeds.

#### F-1-4 — Missing product 404 causes broken, third-party-hosted routing

**Location/quote:** `/404`, `/does-not-exist`, and `/demo` return Azure Static
Web Apps’ generic 404 with no Quietwall h1, main, header, footer, or way home.
The page requests scripts/styles/images from `ajax.aspnetcdn.com` and
`appservice.azureedge.net` and logs a failed-resource console error.

**Why this fails:** broken routes leave the product identity and violate the
stated local-only privacy posture. The site-structure contract explicitly
makes a generic 404 or broken routing blocking.

**Concrete fix:** ship a Quietwall-styled `/404.html`, configure
`responseOverrides.404.rewrite`, retain a real 404 status, add `Page not found
— return to Quietwall`, and verify only same-origin requests.

## Claims verification — blocking

### F-1-5 — No claim registry or claim tests

`.factory/claims.json` is absent and `rg '@claim:'` returns no matches. There
were therefore zero listed claim commands to run. Every claim below is
unlisted and untested under the claims contract. Each row is a separate
finding; add exactly one `.factory/claims.json` entry and one observable test
tagged `@claim:<id>`, using only `/demo` and its shipped data, or remove the
sentence. Compound claims must first be split into one claim per sentence.

### Landing and metadata: unlisted claims

| ID | Exact quote and location | Concrete test or removal |
| --- | --- | --- |
| F-1-6 | Home meta description: “A tiny, local-first Android website blocker with no accounts, tracking, or network calls.” | Replace the false “no network calls” wording; test no third-party/telemetry requests and native permitted-DNS behavior separately. |
| F-1-7 | Hero: “A plain domain wall designed to run on your Android device.” | Instrument the Android build and prove a listed domain is blocked device-wide. |
| F-1-8 | Hero: “No account, no browsing log, no subscription—and no server to phone home to.” | Test each privacy/price claim with request, storage, dependency, and billing inspection. |
| F-1-9 | Figure: “A closed loop: rules stay between you and your phone.” | Record requests and storage during the full demo, including import/export and reset. |
| F-1-10 | Help: “A bare domain blocks it and its subdomains.” | Add a matcher test for apex and nested subdomains. |
| F-1-11 | Help: “Use *.example.com to make the wildcard explicit.” | Add a wildcard test proving subdomains match and the apex does not. |
| F-1-12 | Empty state: “Your list never leaves this device.” | Assert same-origin-only browser traffic and inspect Android traffic during list edits. |
| F-1-13 | Setting: “Once armed, a pause request waits this long.” | Use a fake clock to verify the configured delay and eventual pause. |
| F-1-14 | Setting: “Uninstalling still bypasses it.” | Document as a limitation and verify uninstall behavior on Android. |
| F-1-15 | Setting: “Overnight ranges work.” | Test an overnight schedule before, during, and after the range. |
| F-1-16 | Setting: “Equal times means all day.” | Test equal start/end times over representative times. |
| F-1-17 | Limits: “On Android, the local VPN filters matching DNS names in apps and browsers when Android sends DNS through it.” | Run an Android device test across a browser and another app. |
| F-1-18 | Limits: “Android permits one VPN at a time.” | Verify the platform conflict flow on a supported Android device. |
| F-1-19 | Limits: “Another VPN, Private DNS, an app’s own resolver (including DoH/DoT), direct IP links, or uninstalling Quietwall can bypass it.” | Add device tests or remove each unverified bypass assertion. |
| F-1-20 | Limits: “Quietwall sends no analytics or DNS logs anywhere.” | Record browser and Android traffic and inspect persistent stores/log output. |
| F-1-21 | Limits: “Allowed DNS requests go only to the resolver already supplied by your current network.” | Capture packets and assert the destination is the active network resolver. |
| F-1-22 | Android note: “Android-only protection needs VPN consent.” | Test accept and cancel branches of Android VPN consent. |
| F-1-23 | Android note: “The APK asks Android to create a local DNS VPN when you arm rules.” | Assert the consent intent and VPN interface creation on a device. |
| F-1-24 | Android note: “This website keeps the same offline list but cannot itself intercept device traffic.” | Test offline persistence and confirm browser traffic remains unaffected. |
| F-1-25 | Footer: “Free and open source.” | Verify no purchase path and that the shipped source/license matches the artifact. |
| F-1-26 | Footer: “Original pixel artwork; no user or browsing data is collected.” | Record asset provenance separately; test collection with browser and Android request/storage logs. |
| F-1-27 | Hero/status fragments: “NO CLOUD · LOCAL ONLY”, “DEVICE-LOCAL”, “OPEN EXPORT”, “NO SDKs”, and “SAVED ON DEVICE”. | Split these claims and test same-origin traffic, storage location, export contents, dependency tree, and persistence. |

### README: unlisted claims

| ID | Exact sentence and location | Concrete test or removal |
| --- | --- | --- |
| F-1-28 | Intro: “Quietwall is a local Android website blocker for people who want a plain domain list, optional focus hours, and a self-imposed delay before pausing—without an account, tracking SDK, subscription, or hosted DNS provider.” | Split and test device blocking, list, schedule, delay, dependencies, network, and price. |
| F-1-29 | Intro: “The Capacitor Android app uses Android's `VpnService` after explicit system consent.” | Add an Android consent/service test. |
| F-1-30 | Intro: “It directs ordinary UDP DNS through two local VPN addresses, answers a matching domain with NXDOMAIN on-device, and forwards allowed DNS only to the resolver supplied by the current Wi-Fi/mobile network.” | Add packet-level block and relay tests on a device. |
| F-1-31 | Intro: “It does not use a Quietwall resolver, account, analytics endpoint, telemetry SDK, DNS log, or browsing-history database.” | Test dependency/network/storage absence. |
| F-1-32 | Intro: “Rules, schedules, and the delayed-unlock setting are copied from the offline PWA UI to private Android storage so filtering can continue when the WebView is closed.” | Add a bridge/persistence test that closes the WebView. |
| F-1-33 | Intro: “The website/PWA remains the same local-first configurator: it stores rules in IndexedDB, works offline after installation, and supports versioned JSON import/export.” | Split into IndexedDB, offline, import, and export tests using `/demo`. |
| F-1-34 | Intro: “A browser cannot intercept device DNS, so only the Android APK performs device-level filtering.” | Test the APK outcome and keep the web limitation beside its control. |
| F-1-35 | Intro: “Quietwall is commitment software, not parental control.” | Test/document the bypass boundary; do not present an enforcement guarantee. |
| F-1-36 | Run locally: “Requirements: Node.js 20 or newer.” | Add a CI matrix or `engines` check proving the minimum. |
| F-1-37 | Run locally: “Android builds additionally require JDK 21 and Android SDK Platform 35 / Build Tools 35.0.0.” | Assert tool versions in the Android build workflow. |
| F-1-38 | Run locally: “Vite prints the local development URL.” | Add a smoke command that starts the documented development server. |
| F-1-39 | Run locally: “No runtime service, database server, secret, or environment variable is needed.” | Start from a cleared environment and assert the app works. |
| F-1-40 | Test: “`npm test` runs domain/state unit checks, creates a production build, then runs the Chromium end-to-end suite at desktop and 390 px.” | Add a script-contract test or make CI evidence authoritative. |
| F-1-41 | Test: “The browser suite covers local persistence, validation/error states, accessibility with axe, static legal routes, and offline reload with saved data.” | Add claim tags for every named observable; current test names are untagged. |
| F-1-42 | Test: “Playwright’s Chromium is installed with `npx playwright install chromium` if it is not already available.” | Correct to an instruction: “Install Chromium with …”. |
| F-1-43 | Build: “The exact production command is `npm run build`.” | Add CI that invokes the exact command from a clean checkout. |
| F-1-44 | Build: “Static output lands in `dist/` with `dist/index.html` at its root.” | Assert the file after a clean production build. |
| F-1-45 | Android: “The Capacitor project uses app id `in.sociobot.androidsiteblockerprivate` and lives in `android/`.” | Assert the manifest/application id in the Android build. |
| F-1-46 | Android: “The resulting `app-debug.apk` is a debug artifact signed by Android's generated debug certificate, never a production/release key; the GitHub Actions workflow uploads it together with a SHA-256 file.” | Split and test certificate identity, artifact upload, and checksum. |
| F-1-47 | Android: “Release signing is intentionally outside this repository.” | Add a secret/keystore scan in CI. |
| F-1-48 | Android: “When the user presses **ARM RULES** in the Android APK, Android presents the standard VPN consent screen.” | Add a device UI test for the action and dialog. |
| F-1-49 | Android: “A persistent low-priority system notification confirms that the local DNS service is running.” | Add a device test that inspects the notification while active. |
| F-1-50 | Android: “The service is `START_NOT_STICKY`; it is restored after a reboot only when the user left protection armed.” | Split and test lifecycle and boot recovery. |
| F-1-51 | Android: “Cancelling the consent dialog leaves the rule set paused.” | Add a cancellation device test. |
| F-1-52 | Filtering: “Bare domains match themselves and all subdomains.” | Add a tagged matcher claim test. |
| F-1-53 | Filtering: “`*.example.com` matches subdomains but not the apex.” | Add a tagged wildcard claim test. |
| F-1-54 | Filtering: “IPv4 and IPv6 UDP DNS packets are bounds-checked, including IPv6 extension/fragment handling.” | Add malformed/boundary packet tests tied to the claim. |
| F-1-55 | Filtering: “The VPN sends blocked queries a locally generated NXDOMAIN and relays permitted queries to the active network's advertised resolver with the socket excluded from the VPN loop.” | Split into NXDOMAIN, relay destination, and loop-exclusion tests. |
| F-1-56 | Limits: “Android supports one active VPN.” | Test the supported-version platform behavior or cite it as an external Android constraint. |
| F-1-57 | Limits: “Starting another VPN disconnects Quietwall.” | Add a two-VPN device test. |
| F-1-58 | Limits: “Android Private DNS, an app using its own resolver (including DoH/DoT), TCP-only DNS, direct IP URLs, and uninstalling the app can bypass or fall outside this DNS filter.” | Split and verify each bypass path. |
| F-1-59 | Privacy: “No DNS queries, rule matches, IP addresses, counters, crash reports, or analytics leave Quietwall.” | Capture all Android egress during block/allow/configuration flows. |
| F-1-60 | Privacy: “Permitted DNS still necessarily goes to the DNS resolver chosen by the current network.” | Assert the resolver destination in the same capture. |
| F-1-61 | Privacy: “There are no analytics, advertisements, Quietwall remote APIs, CDN assets, external fonts, or user accounts.” | Inspect dependencies and record all browser/Android requests. |
| F-1-62 | Privacy: “Rules and settings remain in browser IndexedDB and, for the Android VPN, private app storage.” | Inspect both stores before and after edits. |
| F-1-63 | Privacy: “Export creates a local JSON file.” | Download in `/demo` and validate its schema and records. |
| F-1-64 | Privacy: “The service deliberately writes no DNS or browsing logs.” | Inspect logcat and app storage after DNS traffic. |
| F-1-65 | Deploy: “`dist/staticwebapp.config.json` configures immutable caching for hashed JS/CSS, no-cache for documents and the service worker, CSP/anti-framing headers, and `application/manifest+json` for the manifest.” | Split and assert every live response header/MIME claim. |
| F-1-66 | Deploy: “`dist/_headers` provides the same headers for compatible static hosts.” | Test with a supported local static host or remove the compatibility promise. |
| F-1-67 | Deploy: “The service worker precaches the versioned app shell and updates through an in-app reload notice.” | Tag the precache and waiting-worker update tests. |
| F-1-68 | License: “MIT.” | Verify the repository and shipped notices contain the MIT license. |

The live root request log itself contained only the product origin, and a
fresh saved rule survived an offline reload. Those observations do not cure
the missing claim entries/tests. `/demo` could not be used as the required
sandbox. The generic 404 made third-party Azure requests.

## Copy audit

Counts use `Intl.Segmenter` English word-like tokens. Headings and controls are
audited separately after the sentence tables. `U` means unlisted claim, `L`
means over 22 words, `J` means unexplained jargon, and `M` means metaphor,
mood, or slogan. Every flagged row points to a finding and a concrete fix.

### Landing page sentences

| Words | Exact sentence | Flags / proposed rewrite or fix |
| ---: | --- | --- |
| 3 | “Your block list.” | M, F-1-69. Replace the full h1 with `Block websites across your Android device`. |
| 3 | “Nobody else’s business.” | M, F-1-69. Delete the slogan; put the privacy fact in the supporting sentence. |
| 11 | “A plain domain wall designed to run on your Android device.” | U/J/M, F-1-7. Rewrite: `Quietwall blocks chosen domains across your Android device.` Then test it. |
| 14 | “No account, no browsing log, no subscription—and no server to phone home to.” | U/M, F-1-8. Rewrite: `No account, browsing log, subscription, or Quietwall server.` Then test each claim. |
| 10 | “A closed loop: rules stay between you and your phone.” | U/M, F-1-9. Rewrite: `Your rules stay on this device.` Then test it. |
| 8 | “A bare domain blocks it and its subdomains.” | U/J, F-1-10. Rewrite: `example.com also blocks its subdomains.` |
| 7 | “Use *.example.com to make the wildcard explicit.” | U/J, F-1-11. Rewrite: `*.example.com blocks subdomains, but not example.com.` |
| 8 | “Add the site that steals the most time.” | M, F-1-70. Rewrite: `Add a domain you want to block.` |
| 6 | “Your list never leaves this device.” | U, F-1-12. Test or remove. |
| 8 | “Once armed, a pause request waits this long.” | U, F-1-13. Test or remove. |
| 4 | “Uninstalling still bypasses it.” | U, F-1-14. Test or remove. |
| 3 | “Overnight ranges work.” | U, F-1-15. Test or remove. |
| 5 | “Equal times means all day.” | U, F-1-16. Test or remove. |
| 2 | “Small surface.” | M, F-1-71. Replace both fragments with `What Quietwall blocks and what can bypass it`. |
| 2 | “Honest limits.” | M, F-1-71. Same rewrite as above. |
| 19 | “On Android, the local VPN filters matching DNS names in apps and browsers when Android sends DNS through it.” | U/J, F-1-17. Rewrite: `On Android, Quietwall blocks matching domain requests from apps and browsers.` |
| 7 | “Android permits one VPN at a time.” | U, F-1-18. Test or remove. |
| 20 | “Another VPN, Private DNS, an app’s own resolver (including DoH/DoT), direct IP links, or uninstalling Quietwall can bypass it.” | U/J, F-1-19. Split into `Another VPN or Private DNS can bypass Quietwall.` and a second sentence for apps/direct IPs/uninstalling. Define DoH/DoT elsewhere. |
| 8 | “Quietwall sends no analytics or DNS logs anywhere.” | U, F-1-20. Test or remove. |
| 14 | “Allowed DNS requests go only to the resolver already supplied by your current network.” | U/J, F-1-21. Rewrite: `Allowed requests use your current network’s DNS service.` |
| 6 | “Android-only protection needs VPN consent.” | U/J, F-1-22. Rewrite: `Android asks for VPN permission before blocking starts.` |
| 14 | “The APK asks Android to create a local DNS VPN when you arm rules.” | U/J, F-1-23. Rewrite: `The Android app asks for VPN permission when you start blocking.` |
| 13 | “This website keeps the same offline list but cannot itself intercept device traffic.” | U/J, F-1-24. Rewrite: `This website saves your list offline, but it cannot block traffic.` |
| 3 | “Private by construction.” | M, F-1-72. Delete it or use the tested fact `Rules stay on this device.` |
| 4 | “Free and open source.” | U, F-1-25. Test or remove. |
| 10 | “Original pixel artwork; no user or browsing data is collected.” | U, F-1-26. Split provenance from the data claim and test the latter. |

### README sentences

| Words | Exact sentence | Flags / proposed rewrite or fix |
| ---: | --- | --- |
| 35 | “Quietwall is a local Android website blocker for people who want a plain domain list, optional focus hours, and a self-imposed delay before pausing—without an account, tracking SDK, subscription, or hosted DNS provider.” | U/L/J, F-1-28. Rewrite as three sentences: `Quietwall blocks chosen domains across Android.` `It includes focus hours and a delay before pausing.` `It needs no account or subscription.` |
| 11 | “The Capacitor Android app uses Android's VpnService after explicit system consent.” | U/J, F-1-29. Rewrite: `The Android app starts a local VPN after you approve Android’s permission prompt.` |
| 34 | “It directs ordinary UDP DNS through two local VPN addresses, answers a matching domain with NXDOMAIN on-device, and forwards allowed DNS only to the resolver supplied by the current Wi-Fi/mobile network.” | U/L/J, F-1-30. Rewrite as three sentences: `The app handles standard DNS requests on your device.` `Blocked domains receive a not-found response.` `Allowed requests use your network’s DNS service.` |
| 18 | “It does not use a Quietwall resolver, account, analytics endpoint, telemetry SDK, DNS log, or browsing-history database.” | U/J, F-1-31. Rewrite: `Quietwall has no account, analytics, browsing log, or company-run DNS service.` |
| 27 | “Rules, schedules, and the delayed-unlock setting are copied from the offline PWA UI to private Android storage so filtering can continue when the WebView is closed.” | U/L/J, F-1-32. Rewrite: `The app copies rules, schedules, and delay settings to private Android storage.` `Filtering continues after its screen closes.` |
| 24 | “The website/PWA remains the same local-first configurator: it stores rules in IndexedDB, works offline after installation, and supports versioned JSON import/export.” | U/L/J, F-1-33. Rewrite: `The website stores rules in your browser.` `After installation, it works offline and imports or exports JSON files.` |
| 15 | “A browser cannot intercept device DNS, so only the Android APK performs device-level filtering.” | U/J, F-1-34. Rewrite: `The website cannot block traffic.` `Only the installed Android app can block sites across the device.` |
| 7 | “Quietwall is commitment software, not parental control.” | U/J, F-1-35. Rewrite: `Quietwall helps you keep your own block list; it cannot enforce parental controls.` |
| 5 | “Requirements: Node.js 20 or newer.” | U, F-1-36. Test or state it as a checked prerequisite. |
| 14 | “Android builds additionally require JDK 21 and Android SDK Platform 35 / Build Tools 35.0.0.” | U/J, F-1-37. Rewrite as a requirements list with the exact tool names and test it. |
| 6 | “Vite prints the local development URL.” | U, F-1-38. Test or rewrite as the instruction `Open the URL printed by Vite.` |
| 11 | “No runtime service, database server, secret, or environment variable is needed.” | U, F-1-39. Test or remove. |
| 24 | “`npm test` runs domain/state unit checks, creates a production build, then runs the Chromium end-to-end suite at desktop and 390 px.” | U/L/J, F-1-40. Rewrite: `npm test runs unit checks and builds the app.` `It then runs Chromium tests on desktop and at 390 px.` |
| 21 | “The browser suite covers local persistence, validation/error states, accessibility with axe, static legal routes, and offline reload with saved data.” | U/J, F-1-41. Rewrite as a bulleted test-coverage list and tag the claims. |
| 15 | “Playwright’s Chromium is installed with `npx playwright install chromium` if it is not already available.” | U/passive, F-1-42. Rewrite: `If Chromium is missing, run npx playwright install chromium.` |
| 8 | “The exact production command is `npm run build`.” | U, F-1-43. Test or remove. |
| 11 | “Static output lands in `dist/` with `dist/index.html` at its root.” | U, F-1-44. Test or remove. |
| 11 | “The Capacitor project uses app id `in.sociobot.androidsiteblockerprivate` and lives in `android/`.” | U/J, F-1-45. Rewrite as two entries in an Android build facts list. |
| 31 | “The resulting `app-debug.apk` is a debug artifact signed by Android's generated debug certificate, never a production/release key; the GitHub Actions workflow uploads it together with a SHA-256 file.” | U/L/J, F-1-46. Rewrite: `app-debug.apk is signed with Android’s generated debug certificate.` `It is not a release build.` `GitHub Actions uploads it with a SHA-256 checksum.` |
| 7 | “Release signing is intentionally outside this repository.” | U, F-1-47. Test or remove. |
| 17 | “When the user presses ARM RULES in the Android APK, Android presents the standard VPN consent screen.” | U/J, F-1-48. Rewrite: `When you select Start blocking, Android asks for VPN permission.` |
| 14 | “A persistent low-priority system notification confirms that the local DNS service is running.” | U/J, F-1-49. Rewrite: `While blocking is on, Android shows a low-priority notification.` |
| 17 | “The service is START_NOT_STICKY; it is restored after a reboot only when the user left protection armed.” | U/J, F-1-50. Rewrite: `Android does not restart a stopped service automatically.` `After a reboot, Quietwall starts only if blocking was already on.` |
| 9 | “Cancelling the consent dialog leaves the rule set paused.” | U, F-1-51. Test or remove. |
| 7 | “Bare domains match themselves and all subdomains.” | U/J, F-1-52. Rewrite: `example.com also matches its subdomains.` |
| 7 | “`*.example.com` matches subdomains but not the apex.” | U/J, F-1-53. Rewrite: `*.example.com matches subdomains but not example.com itself.` |
| 14 | “IPv4 and IPv6 UDP DNS packets are bounds-checked, including IPv6 extension/fragment handling.” | U/J, F-1-54. Define the packet terms or move this to developer documentation; test it. |
| 27 | “The VPN sends blocked queries a locally generated NXDOMAIN and relays permitted queries to the active network's advertised resolver with the socket excluded from the VPN loop.” | U/L/J, F-1-55. Rewrite: `Blocked requests receive a local not-found response.` `Allowed requests go to the network’s DNS service outside Quietwall’s VPN loop.` |
| 5 | “Android supports one active VPN.” | U, F-1-56. Test or cite the supported Android behavior. |
| 5 | “Starting another VPN disconnects Quietwall.” | U, F-1-57. Test or remove. |
| 30 | “Android Private DNS, an app using its own resolver (including DoH/DoT), TCP-only DNS, direct IP URLs, and uninstalling the app can bypass or fall outside this DNS filter.” | U/L/J, F-1-58. Rewrite as a short `What can bypass Quietwall` list and define encrypted DNS. |
| 14 | “No DNS queries, rule matches, IP addresses, counters, crash reports, or analytics leave Quietwall.” | U, F-1-59. Test or remove. |
| 14 | “Permitted DNS still necessarily goes to the DNS resolver chosen by the current network.” | U/J, F-1-60. Rewrite: `Allowed requests still go to your network’s DNS service.` |
| 15 | “There are no analytics, advertisements, Quietwall remote APIs, CDN assets, external fonts, or user accounts.” | U/J, F-1-61. Rewrite: `Quietwall has no analytics, ads, remote service, external assets, or accounts.` |
| 15 | “Rules and settings remain in browser IndexedDB and, for the Android VPN, private app storage.” | U/J, F-1-62. Rewrite: `The website stores rules in your browser.` `The Android app stores them in its private app storage.` |
| 6 | “Export creates a local JSON file.” | U/J, F-1-63. Rewrite: `Export block list downloads a JSON file to your device.` |
| 9 | “The service deliberately writes no DNS or browsing logs.” | U/J, F-1-64. Rewrite: `Quietwall does not save DNS requests or browsing history.` |
| 7 | “See `/privacy/` and `/terms/` in the app.” | — |
| 11 | “Publish the contents of `dist/` at `https://android-site-blocker-private.sociobot.in`.” | — |
| 28 | “`dist/staticwebapp.config.json` configures immutable caching for hashed JS/CSS, no-cache for documents and the service worker, CSP/anti-framing headers, and `application/manifest+json` for the manifest.” | U/L/J, F-1-65. Rewrite as a deployment checklist with one header behavior per item. |
| 10 | “`dist/_headers` provides the same headers for compatible static hosts.” | U/J, F-1-66. Name the compatible host or remove the promise. |
| 16 | “The service worker precaches the versioned app shell and updates through an in-app reload notice.” | U/J, F-1-67. Rewrite: `The service worker saves the app files for offline use.` `When an update is ready, the app shows a Reload button.` |
| 1 | “MIT.” | U, F-1-68. Verify the shipped license. |
| 2 | “See LICENSE.” | — |

### Heading, label, terminology, and control findings

#### F-1-69 — Home h1 is a slogan, not the job

**Quote:** “Your block list. Nobody else’s business.”  
**Fix:** `Block websites across your Android device`.

#### F-1-70 — Empty-state metaphor assigns intent

**Quote:** “Add the site that steals the most time.”  
**Fix:** `Add a domain you want to block.`

#### F-1-71 — Mood heading does not name its section

**Quote:** “Small surface. Honest limits.”  
**Fix:** `What Quietwall blocks and what can bypass it`.

#### F-1-72 — Footer slogan carries no usable information

**Quote:** “Private by construction.”  
**Fix:** delete it or replace it with the tested fact `Rules stay on this
device.`

#### F-1-73 — Decorative and jargon labels are not plain headings

**Quotes:** “ANDROID SITE BLOCKER / ZERO TELEMETRY”, “LOCAL CONFIGURATOR”,
“THREAT MODEL”, “DEVICE-LOCAL”, “OPEN EXPORT”, and “NO SDKs”.  
**Fix:** use `Android website blocker`, `Set up your block list`, `Limits`,
`Saved on this device`, `Export your list`, and `No tracking software`.

#### F-1-74 — Multiple headings do not make sense out of context

**Quotes:** “Build your wall”, “What it blocks”, “What can bypass it”, and
“Network promise”.  
**Fix:** use `Set up your block list`, `What Quietwall blocks`, `What can bypass
Quietwall`, and `Where allowed DNS requests go`.

#### F-1-75 — Controls do not consistently name their result

**Quotes:** “ARM RULES”, “Import”, and “Export”.  
**Fix:** use `Start blocking` only in the functioning Android app; use `Save
block list` on the web; rename the file actions `Import block list` and
`Export block list`.

#### F-1-76 — README h1 is only the product name

**Quote/location:** README `# Quietwall`.  
**Fix:** `# Quietwall — block websites privately on Android`.

Terminology is inconsistent: the same concept is called **site**, **website**,
**domain**, **DNS name**, **rule**, **block list**, **domain list**, and **wall**.
Use **domain** for an entry, **block list** for the collection, and **blocking**
for the active Android result. Define DNS/VPN once in the technical section.

## Structure, routing, and accessibility findings

#### F-1-77 — Required social and device metadata is missing

**Location:** `/`, `/privacy/`, and `/terms/` have no Open Graph metadata,
Twitter card metadata, or apple-touch icon. `/offline.html` also lacks a meta
description, canonical link, and favicon.  
**Fix:** add route-specific title/description/canonical metadata, a real
1200 × 630 image based on the pixel-gate art, Twitter tags, SVG favicon, and a
180 px apple-touch icon. Keep the current correct title pattern on existing
main/legal routes.

#### F-1-78 — Header and footer skeleton changes by route

**Location:** home has no navigation; legal pages replace status with “Back to
app”; `/offline.html` has no header/footer. Footers differ and none contains
“Built by Param Factory” or a version/build id.  
**Fix:** use one header (wordmark, Demo, Privacy, skip link) and one footer
(plain one-line description, Privacy, Terms, Built by Param Factory, build id)
on every route.

#### F-1-79 — Route changes do not move focus or announce the page

**Evidence:** after following Privacy and after browser Back, `activeElement`
was `body`, not the new h1. There is no route announcement live region.  
**Fix:** focus a `tabindex="-1"` h1 and announce its title after navigation;
test forward/back focus and scroll restoration.

#### F-1-80 — Sitemap omits required routes

**Location:** `sitemap.xml` lists only `/`, `/privacy/`, and `/terms/`.
`/demo` and a designed 404 are absent; `/offline.html` is also unlisted.  
**Fix:** add every public route after implementing it and verify each URL.

#### F-1-81 — Mobile touch targets are below 44 px

**Evidence at 390 px:** both brand links are 34 px high; Privacy, Terms, and
Source code are 21.7 px high; the schedule checkbox is 22 × 22 px.  
**Fix:** provide at least a 44 × 44 px clickable box for every interactive
element, including the checkbox label and footer links.

#### F-1-82 — Legal/offline h1 copy is mood copy, and offline metadata is incomplete

**Quotes:** Privacy: “Nothing to hide in the fine print.” Terms: “Simple terms
for a simple tool.” Offline: “You’re offline. Good.”  
**Fix:** use `How Quietwall handles your data`, `Terms for using Quietwall`, and
`Quietwall is offline`. Add the missing offline metadata noted in F-1-77.

#### F-1-83 — External destination is not identified

**Location/quote:** footer link “Source code” points to GitHub with no external
destination cue.  
**Fix:** label it `Source code on GitHub (external)` and expose the same text to
assistive technology.

#### F-1-84 — The standard landing skeleton omits “How it works”

**Location:** the page moves from the hero directly into the configurator and
then limitations. There is no three-step, verb-led explanation of install,
add, and start-blocking.  
**Fix:** add `How it works`: `Install Quietwall`, `Add domains`, `Start
blocking`, with real Android screenshots or the required walkthrough.

## Checks with no finding

- Live `/`, `/privacy/`, `/terms/`, the GitHub source link, `robots.txt`,
  `sitemap.xml`, and `manifest.webmanifest` returned 200. Existing deep links
  load directly, and browser Back returns to the home page.
- Root and legal pages have `lang="en"`, one h1, one main landmark, a canonical
  URL, a description, and a route-appropriate title. The root favicon exists.
- Root request capture at both viewports was same-origin only; there were no
  console/page errors. The root CSP and other security headers were present.
- `verify-url.sh` passed. `npx @axe-core/cli` 4.13.0 reported 0 violations on
  the live home page. Manual touch-target failures remain F-1-81.
- The live visual identity is distinct: the dark pixel-control-room system,
  clipped shapes, and original gate diagram do not resemble a generic SaaS
  card/gradient template.
- Import and export already exist. Sync would conflict with the product’s
  local-only premise, and AI would not improve the core blocking task. No
  decorative AI or embedded provider key was found. The missed obvious feature
  is installability, covered by F-1-3.
- Main JavaScript is 25.27 kB uncompressed (9.36 kB gzip), below the budget.

## Test execution

The tracked worktree was unchanged before verification.

| Command/check | Result |
| --- | --- |
| `npm ci` | PASS; 171 packages, 0 known vulnerabilities. |
| Initial `npm test` | Environment prerequisite failure: package Playwright 1.62.1 had no matching Chromium 1234 binary. |
| `npx playwright install chromium` | PASS; installed the declared browser. |
| Final `npm test` | PASS; 12 Vitest, 1 precache, and 12 Playwright cases. None is tagged as a claim test. |
| `npm run build` | PASS; `dist/` emitted. |
| Live offline reload | PASS for a real `quietwall-local` record; not run in a demo because no demo exists. |
| Root privacy request log | PASS for same-origin-only requests. |
| `/demo` privacy request log | FAIL; generic 404 loaded Azure/ASP.NET CDN resources. |
| `verify-url.sh` | PASS. |
| `npx @axe-core/cli` | PASS; 0 automated violations. |

## History check

No earlier `.factory/review-*.md` or `.factory/polish-*.md` files exist, so
there are no earlier review IDs to preserve. The existing handoff and all four
verification reports were read.

- The earlier invisible file-picker focus defect remains fixed in code with
  `tabindex="-1"` and is covered by the passing keyboard test.
- The earlier absent Android VPN implementation is fixed in source and covered
  by JVM tests recorded in the prior handoff, but no public install path or
  device-level claim test exists; F-1-3 and the unlisted Android claims remain.
- The earlier service-worker precache defect remains fixed. A fresh live
  worker controlled the page and offline reload retained a rule.
- The earlier “no network calls” wording is **not fixed**. It remains verbatim
  in the live meta description even though the PWA fetches its own files and
  Android relays permitted DNS. This is recorded as F-1-6.
- The handoff’s “no defects” conclusion does not survive this required
  first-read/demo/claims/site-structure checklist.

## What would make this perfect

Resolve every finding. The minimum coherent release is a first-screen job
headline with demo and install actions; an isolated, resettable sample demo;
truthful web-only states; a publicly installable signed Android build; complete
claim registration and tests; plain, consistent copy; a product 404; complete
metadata/navigation/focus behavior; and 44 px touch targets. Re-run this entire
checklist from a fresh browser and clean checkout. A pass requires zero
remaining findings and zero untested claims.
