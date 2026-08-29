# Polish round 1 — finding closure

Candidate `7007276bc6695171adef896cf05724de666cc234` was repaired from review commit `98f7a3d02c65908a0881ef08e0c53e712a4811b8`.

Evidence screenshots:

- `.factory/evidence/home-desktop.png`
- `.factory/evidence/demo-mobile.png`
- `.factory/evidence/privacy-desktop.png`
- `.factory/evidence/404-mobile.png`

Automated evidence names below refer to `tests/app.spec.ts`, `src/domain.test.ts`, `scripts/native-claims.test.mjs`, or `scripts/verify-precache.test.mjs`. Every registered command also appears in `.factory/claims.json`.

## Blocking and claim findings

| Finding | Change made | Evidence |
| --- | --- | --- |
| F-1-1 | Replaced the slogan h1 with the requested job headline, named Android users, and placed demo and APK actions with outcomes on the first screen. | `home-desktop.png`; mobile first-screen check in `mobile layout has no overflow…`; live `/`. |
| F-1-2 | Added one-click `?demo=1` and `/demo/`, four realistic rules, focus hours, delay, persistent banner, reset, exit, offline support, and `quietwall-demo` isolation. | `@claim:demo-isolation`, `@claim:offline-demo`; `demo-mobile.png`; live `/?demo=1`. |
| F-1-3 | Browser control is now `Save block list` and says the browser is not blocking. A signed APK and checksum are public first-screen downloads. Native-only wording retains `Start blocking`. | `@claim:web-config-only`, `@claim:apk-download`, `@claim:apk-signature`; live APK request. |
| F-1-4 | Added styled `404.html`, shared header/footer, same-origin assets, and Azure `responseOverrides` preserving status 404. | route/axe test on `/does-not-exist`; `404-mobile.png`; live 404 status check. |
| F-1-5 | Added `.factory/claims.json` with one tagged test and clean-state command for each retained public claim. | 15 registry commands passed independently and in the clean-clone run. |
| F-1-6 | Replaced false “no network calls” metadata with precise local DNS wording. | route metadata test; direct `<meta>` inspection. |
| F-1-7 | Rewrote the claim plainly and tied it to native VPN, DNS response, matcher, consent, APK, and emulator tunnel evidence. | `@claim:android-dns-filter`; `QuietwallVpnInstrumentedTest`. |
| F-1-8 | Split account, subscription, privacy, and network behavior into precise registered claims. | `@claim:free-no-account`, `@claim:native-privacy`, `@claim:network-resolver`. |
| F-1-9 | Replaced loop metaphor with a precise local-list statement. | `@claim:browser-privacy`; request log. |
| F-1-10 | Rewrote bare-domain help with an example and tested apex plus nested names. | `@claim:domain-matching`. |
| F-1-11 | Rewrote wildcard help to state that the apex is excluded and tested it. | `@claim:domain-matching`. |
| F-1-12 | Replaced the empty-state claim with an action; the retained storage statement is tested. | `@claim:browser-privacy`. |
| F-1-13 | Reworded the pause delay and tied it to the tested time boundary and Android alarm. | `@claim:pause-delay`. |
| F-1-14 | Removed the isolated assertion; bypass limits are grouped and bounded to non-device-admin behavior. | `@claim:filter-boundary`. |
| F-1-15 | Reworded overnight behavior as “may cross midnight” and tested before, during, and after. | `@claim:focus-hours`. |
| F-1-16 | Reworded equal times as all-day behavior and tested it. | `@claim:focus-hours`. |
| F-1-17 | Replaced jargon with the exact standard-DNS behavior and verified NXDOMAIN through the Android VPN tunnel. | `@claim:android-dns-filter`; `QuietwallVpnInstrumentedTest`. |
| F-1-18 | Removed the standalone unverified one-VPN assertion from landing copy. | Copy audit; no old sentence in rendered pages. |
| F-1-19 | Reduced the limits to concrete filter boundaries and lack of device-admin enforcement. | `@claim:filter-boundary`. |
| F-1-20 | Replaced the broad claim with tested absence of analytics clients, APIs, and log storage. | `@claim:native-privacy`, `@claim:browser-privacy`. |
| F-1-21 | Reworded resolver behavior and verified active-network discovery, port 53, and VPN socket protection. | `@claim:network-resolver`. |
| F-1-22 | Rewrote consent wording in plain language. | `@claim:android-dns-filter`. |
| F-1-23 | Removed “arm rules”; native code and copy now use `Start blocking`. | `@claim:android-dns-filter`; source search. |
| F-1-24 | Split the browser limitation from offline storage behavior. | `@claim:web-config-only`, `@claim:offline-demo`. |
| F-1-25 | Kept the free/MIT statement only with shipped license and no payment/account test. | `@claim:free-no-account`; `/LICENSE.txt`. |
| F-1-26 | Separated artwork provenance from the tested data claim. | `.factory/design.md`; `@claim:native-privacy`, `@claim:browser-privacy`. |
| F-1-27 | Replaced decorative claim fragments with factual labels and registered the retained storage/export/privacy claims. | `copy-audit.md`; `@claim:browser-privacy`, `@claim:json-portability`, `@claim:native-privacy`. |
| F-1-28 | Rewrote the README introduction as short, separated statements. | `copy-audit.md`; matching claim entries. |
| F-1-29 | Rewrote VPN consent in plain language and tested the consent path. | `@claim:android-dns-filter`. |
| F-1-30 | Split native behavior into matching, local response, and network resolver claims. | `@claim:android-dns-filter`, `@claim:network-resolver`. |
| F-1-31 | Rewrote and tested the absence of analytics, accounts, remote APIs, and company DNS. | `@claim:native-privacy`, `@claim:free-no-account`, `@claim:network-resolver`. |
| F-1-32 | Removed the long unverified lifecycle sentence; README now states only tested private storage behavior. | `@claim:native-privacy`; source inspection. |
| F-1-33 | Split browser storage, offline, import, and export into registered claims. | `@claim:browser-privacy`, `@claim:offline-demo`, `@claim:json-portability`. |
| F-1-34 | Put the web limitation beside its control and in README/terms. | `@claim:web-config-only`. |
| F-1-35 | Recast parental-control wording as an explicit limitation. | `@claim:filter-boundary`; terms route. |
| F-1-36 | Declared Node `>=20` in `package.json.engines` and kept it as a prerequisite. | clean-clone `npm ci`; package inspection. |
| F-1-37 | Kept Android tools as build prerequisites; workflow installs exact Java 21, Platform 35, and Build Tools 35.0.0. | successful GitHub Android workflow for repair commit. |
| F-1-38 | Changed the assertion to the direct instruction “Open the local URL printed by Vite.” | README inspection. |
| F-1-39 | Removed the untested environment claim. | README/source search. |
| F-1-40 | Rewrote the test description and made `npm test` execute every listed suite. | clean-clone `npm test`. |
| F-1-41 | Added tagged claim tests plus named accessibility, persistence, validation, routing, privacy, mobile, and offline tests. | 23 Playwright passes; 12 Vitest passes; 6 native-contract passes. |
| F-1-42 | Corrected the browser line by removing the passive assertion; work order uses pinned Playwright 1.58.2. | `package.json`, lockfile, clean install. |
| F-1-43 | The documented build command ran from the clean clone. | clean-clone `npm run build`. |
| F-1-44 | Verified `dist/index.html` and every route are emitted. | build output and clean-clone file check. |
| F-1-45 | Kept the app id as a build fact and retained the Capacitor project. | `capacitor.config.ts`, Android manifest, workflow build. |
| F-1-46 | Published the debug-signed APK and checksum directly on the static site. | `@claim:apk-download`, `@claim:apk-signature`. |
| F-1-47 | Removed the untested signing-process statement; no release keystore or secret exists in the repository. | repository secret/keystore scan. |
| F-1-48 | Renamed native control to `Start blocking` and retained tested `VpnService.prepare` consent. | `@claim:android-dns-filter`. |
| F-1-49 | Shortened notification copy and verified the foreground notification path is packaged. | `@claim:android-dns-filter`. |
| F-1-50 | Removed detailed restart claims from README/landing copy. | source/copy search. |
| F-1-51 | Removed the standalone cancellation claim; UI error handling remains in native bridge code. | source inspection; no public claim. |
| F-1-52 | Rewrote and tested bare-domain matching. | `@claim:domain-matching`. |
| F-1-53 | Rewrote and tested explicit wildcard behavior. | `@claim:domain-matching`. |
| F-1-54 | Removed packet-format jargon from public copy. | copy audit; existing native packet tests retained. |
| F-1-55 | Split blocked and allowed request behavior into separate claims. | `@claim:android-dns-filter`, `@claim:network-resolver`. |
| F-1-56 | Removed the standalone “one active VPN” claim. | copy search. |
| F-1-57 | Folded other-VPN behavior into the bounded limitations statement. | `@claim:filter-boundary`. |
| F-1-58 | Replaced protocol jargon with standard-DNS scope and concise bypass examples. | `@claim:filter-boundary`; copy audit. |
| F-1-59 | Replaced the broad egress list with testable absence of analytics/API/log stores. | `@claim:native-privacy`. |
| F-1-60 | Reworded and tested active-network resolver use. | `@claim:network-resolver`. |
| F-1-61 | Split browser and Android privacy checks; all runtime assets remain self-hosted. | `@claim:browser-privacy`, `@claim:native-privacy`; request log. |
| F-1-62 | Named both browser databases and private Android settings storage. | `@claim:browser-privacy`, `@claim:native-privacy`; `demo.md`. |
| F-1-63 | Reworded export as a user action and tested the downloaded schema and records. | `@claim:json-portability`. |
| F-1-64 | Reworded and tested the absence of browsing-log storage. | `@claim:native-privacy`. |
| F-1-65 | Removed deployment-header marketing and retained actual deploy configuration. | build output; live header checks. |
| F-1-66 | Removed the compatibility promise about `_headers`. | README inspection. |
| F-1-67 | Kept versioned precache and restored a working waiting-worker reload toast without making marketing claims. | precache test; full browser suite. |
| F-1-68 | Shipped the MIT license at repository root and `/LICENSE.txt`. | `@claim:free-no-account`. |

## Copy, structure, and accessibility findings

| Finding | Change made | Evidence |
| --- | --- | --- |
| F-1-69 | h1 is now `Block websites across your Android device`. | first-screen screenshots and route test. |
| F-1-70 | Empty state now says `Add a domain you want to block.` | rendered empty-state test path; copy audit. |
| F-1-71 | Limits heading now names blocks and bypasses directly. | screenshots; heading outline inspection. |
| F-1-72 | Removed the footer slogan and added the factual product one-liner. | shared footer on every route test. |
| F-1-73 | Replaced decorative jargon with `Android website blocker`, `Set up your block list`, `Limits`, and concrete state labels. | copy audit; screenshots. |
| F-1-74 | Replaced contextless headings with task-specific headings. | heading outline in route/axe test. |
| F-1-75 | Web/native and import/export controls now name their outcomes. | `@claim:web-config-only`, `@claim:json-portability`. |
| F-1-76 | README h1 now states the product job. | README first line. |
| F-1-77 | Added route-specific descriptions, canonicals, OG/Twitter cards, 1200×630 original social art, SVG favicon, and 180px touch icon. | route metadata test; asset dimensions; live head inspection. |
| F-1-78 | Every route now uses one shared header, navigation, footer, factory credit, and build id. | route/axe test across seven URLs. |
| F-1-79 | History navigation updates title, moves focus to h1, announces the route, and records/restores scroll position. | `client routing updates title, focus, history…`. |
| F-1-80 | Sitemap now lists home, query demo, demo alias, privacy, terms, offline, and 404 routes. | `sitemap.xml`; live 200 checks. |
| F-1-81 | Enlarged brand, nav, footer, checkbox, checksum, and all remaining controls to at least 44px. | `mobile layout has no overflow and every visible control is at least 44px`. |
| F-1-82 | Legal/offline h1s are `How Quietwall handles your data`, `Terms for using Quietwall`, and `Quietwall is offline`; metadata is complete. | route/axe test; live route checks. |
| F-1-83 | External link is labeled `Source code on GitHub (external)` and uses `rel=external`. | shared footer inspection and route tests. |
| F-1-84 | Added a three-frame, verb-led Android walkthrough using original pixel SVGs. | `home-desktop.png`, `demo-mobile.png`; live `/`. |

## Final verification summary

- Local full suite: `npm test` — PASS.
- Registered claims: all 15 exact commands — PASS.
- Production build: `npm run build` — PASS; JS 31.70 KB raw / 11.60 KB gzip, CSS 15.61 KB raw / 4.25 KB gzip.
- Automated accessibility: zero serious or critical axe findings across seven routes and both Playwright projects.
- Mobile: 390 × 844 has no horizontal overflow and no visible interactive target below 44 × 44 CSS px.
- Privacy: full demo flow made same-origin requests only; demo opened `quietwall-demo` and not `quietwall-local`.
- Offline: controlled `?demo=1` reloaded with its sample after network disable.
- Live URL: `https://android-site-blocker-private.sociobot.in` (cold verification recorded in `.factory/handoff.md`).
