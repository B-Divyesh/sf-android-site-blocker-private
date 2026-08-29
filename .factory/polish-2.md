# Polish round 2 — cumulative finding closure

Source candidate: `2aeb47692a52d8d8296ae5f371a81c7c448dbb17`. Review commit: `c82686460d1f0ceeb49f547db11f29d60aa0c220`.

Primary evidence:

- `.factory/evidence/demo-mobile-polish-2.png`
- `.factory/evidence/demo-first-viewport-polish-2.png`
- `.factory/evidence/home-desktop-polish-2.png`
- `.factory/evidence/lighthouse-polish-2-local.json`
- `.factory/evidence/lighthouse-polish-2-live.json`
- `.factory/evidence/live-polish-2/verify.json`
- Clean-clone `npm test`: 12 unit, 6 native contract, 1 precache, and 24 browser tests passed; 2 intentional project skips.
- Clean-clone claim execution: all 10 web/unit/package commands passed locally. All 15 exact registry commands run in the clean API 35 emulator workflow.
- Android workflow: <https://github.com/B-Divyesh/sf-android-site-blocker-private/actions/workflows/android-debug-apk.yml>
- Live site: <https://android-site-blocker-private.sociobot.in>

## Review 2 findings

| Finding | Change made | Evidence |
| --- | --- | --- |
| F-2-1 | Demo routes now skip the marketing hero. The focused demo h1, isolated banner, all four rules, Enabled/Paused states, 21:30–07:00 hours, and 15-minute delay fit in the first 390 × 844 viewport. | `one click opens visible sample data in the first mobile viewport`; `@claim:demo-isolation`; `demo-first-viewport-polish-2.png`; live `/?demo=1`. |
| F-2-2 | Replaced the five source-only claim commands with installed-APK instrumentation. Each command clears app data, grants VPN consent, and observes its own runtime outcome on a clean API 35 emulator. | `@claim:android-dns-filter`, `@claim:native-privacy`, `@claim:network-resolver`, `@claim:filter-boundary`, `@claim:pause-delay`; clean emulator workflow. |
| F-2-3 | Removed the unregistered “Rules move…” hero caption. No rule-transfer claim remains. | Copy audit; source search for the removed sentence; `home-desktop-polish-2.png`; live root. |
| F-2-4 | Replaced “Check its SHA-256” with “Download APK checksum to confirm the file did not change” and the result-naming link “Download APK checksum.” | `@claim:apk-download`; `@claim:apk-signature`; `home-desktop-polish-2.png`; live root and checksum URL. |
| F-2-5 | Removed the unregistered native-sync implementation claim from the public README. | README search; clean-clone build and package checks; no old sentence in source. |

## Review 1 cumulative findings

Every earlier finding was re-read and rechecked in this round. These rows map the current retained fix and current evidence.

| Finding | Change retained or strengthened | Evidence |
| --- | --- | --- |
| F-1-1 | Job h1, named Android audience, demo action, APK action, and action outcomes remain on the first screen. | First-screen browser test; `home-desktop-polish-2.png`; live root. |
| F-1-2 | Isolated one-click demo, realistic sample, banner, reset, exit, offline sample, and separate database remain; round 2 makes the sample immediate. | `@claim:demo-isolation`, `@claim:offline-demo`, F-2-1 test and screenshot. |
| F-1-3 | Web control says Save block list and explicitly says the browser is not blocking; public APK remains linked. | `@claim:web-config-only`, `@claim:apk-download`; live root. |
| F-1-4 | Styled same-origin 404 and Azure response override retain status 404 and a return path. | Route/axe test on `/does-not-exist`; live 404 cold check. |
| F-1-5 | Claims registry retains one command per claim; native entries now use observable emulator tests. | `.factory/claims.json`; all 15 registry commands. |
| F-1-6 | Metadata uses precise local-DNS wording rather than “no network calls.” | Route metadata test; live head inspection. |
| F-1-7 | Device blocking is bounded to matching standard DNS after VPN consent and tested through the installed APK. | `@claim:android-dns-filter`; API 35 runtime. |
| F-1-8 | Account, subscription, browser privacy, and native network behavior are split into registered claims. | `@claim:free-no-account`, `@claim:browser-privacy`, native runtime claims. |
| F-1-9 | The closed-loop metaphor remains removed; storage and traffic facts are direct. | `@claim:browser-privacy`; copy audit. |
| F-1-10 | Bare-domain help states apex and subdomain behavior. | `@claim:domain-matching`. |
| F-1-11 | Wildcard help states that the apex is excluded. | `@claim:domain-matching`. |
| F-1-12 | Empty state gives the next action instead of an untested privacy slogan. | Browser empty-state path; copy audit. |
| F-1-13 | Pause text names the delayed outcome; the installed APK is tested before and after expiry. | `@claim:pause-delay`; API 35 runtime. |
| F-1-14 | Uninstall behavior is presented only within the bounded bypass limitation. | `@claim:filter-boundary`; terms and limits copy. |
| F-1-15 | Focus-hours text says ranges may cross midnight. | `@claim:focus-hours`. |
| F-1-16 | Matching times are stated and tested as all day. | `@claim:focus-hours`. |
| F-1-17 | Android filtering uses plain request language and an observed local not-found response. | `@claim:android-dns-filter`. |
| F-1-18 | The standalone one-VPN assertion remains absent. | Copy search and audit. |
| F-1-19 | Limits name concrete bypasses without an enforcement promise. | `@claim:filter-boundary`; terms. |
| F-1-20 | Privacy scope is split between same-origin browser traffic and installed-APK blocked-flow egress/storage. | `@claim:browser-privacy`, `@claim:native-privacy`. |
| F-1-21 | Allowed requests are described as using the current network DNS service and are observed on an online emulator. | `@claim:network-resolver`. |
| F-1-22 | Consent wording remains “Android asks for VPN permission.” | `@claim:android-dns-filter`; copy audit. |
| F-1-23 | Web never reports an armed state; Start blocking remains native-only. | `@claim:web-config-only`; browser suite. |
| F-1-24 | Browser configuration and offline storage remain separate statements. | `@claim:web-config-only`, `@claim:offline-demo`. |
| F-1-25 | Free/MIT/no-account text is backed by the shipped license and absence of auth/payment actions. | `@claim:free-no-account`. |
| F-1-26 | Artwork provenance remains separate from request/storage privacy evidence. | `.factory/design.md`; privacy claims. |
| F-1-27 | Factual state labels replace decorative claim fragments. | Copy audit; browser screenshot. |
| F-1-28 | README opening remains short and separates native blocking from website configuration. | README audit; registered claims. |
| F-1-29 | VPN consent is exercised by granting Android's app operation before the installed-APK DNS test. | `@claim:android-dns-filter`. |
| F-1-30 | Blocked and allowed DNS behaviors remain separate registered outcomes. | `@claim:android-dns-filter`, `@claim:network-resolver`. |
| F-1-31 | Account, analytics/dependency, storage, and resolver facts have browser, package, and runtime evidence. | `@claim:free-no-account`, native contract suite, native runtime suite. |
| F-1-32 | Broad WebView-closed lifecycle wording remains removed. | README/source search. |
| F-1-33 | IndexedDB, offline, import, and export are split and observable in the demo. | `@claim:browser-privacy`, `@claim:offline-demo`, `@claim:json-portability`. |
| F-1-34 | The website limitation remains beside Save block list. | `@claim:web-config-only`; screenshots. |
| F-1-35 | Terms identify commitment software limits without parental-control claims. | `@claim:filter-boundary`; terms route. |
| F-1-36 | Node 20 minimum remains declared. | `package.json`; clean-clone `npm ci`. |
| F-1-37 | Java 21, Platform 35, and Build Tools 35 remain explicit workflow prerequisites. | Successful Android build job. |
| F-1-38 | Vite text remains an instruction, not a product claim. | README inspection. |
| F-1-39 | The broad no-environment assertion remains absent. | README search. |
| F-1-40 | `npm test` runs unit, package contract, precache, desktop, mobile, axe, privacy, and offline checks. | Clean-clone `npm test`. |
| F-1-41 | Named validation, persistence, routing, accessibility, privacy, mobile, and offline tests remain executable. | 24 Playwright passes and 2 project skips. |
| F-1-42 | Playwright remains pinned to 1.58.2 and browser installation is an instruction. | `package.json`, lockfile, clean checkout. |
| F-1-43 | Exact `npm run build` succeeds from a clean checkout. | Clean-clone build output. |
| F-1-44 | Build emits `dist/index.html` plus every route entry. | Vite output and precache test. |
| F-1-45 | Capacitor project and required app id remain. | Android build and runtime package assertion. |
| F-1-46 | Public debug-signed APK and checksum remain directly downloadable. | `@claim:apk-download`, `@claim:apk-signature`. |
| F-1-47 | No release-signing claim or repository keystore is present. | Repository scan and workflow. |
| F-1-48 | Native control says Start blocking; clean emulator grants VPN consent before observing DNS. | `@claim:android-dns-filter`. |
| F-1-49 | The unneeded public notification sentence was removed in round 2; foreground-service packaging stays in contract tests. | Copy search; native contract suite. |
| F-1-50 | Detailed restart behavior remains absent from public copy. | Copy search. |
| F-1-51 | Standalone cancellation claim remains absent. | Copy search. |
| F-1-52 | Bare domains match apex and nested subdomains. | `@claim:domain-matching`. |
| F-1-53 | Explicit wildcard matches subdomains but excludes apex. | `@claim:domain-matching`. |
| F-1-54 | Packet-format jargon remains absent from public text. | Copy audit. |
| F-1-55 | Blocked and allowed outcomes are tested separately. | Android DNS and resolver runtime claims. |
| F-1-56 | Standalone one-active-VPN claim remains removed. | Copy search. |
| F-1-57 | Other-VPN behavior appears only in the bounded bypass statement. | Limits and terms; filter-boundary claim. |
| F-1-58 | Public copy says standard domain requests and concrete bypasses, not packet internals. | Copy audit; filter-boundary claim. |
| F-1-59 | Blocked-flow egress and runtime storage are now observed in the installed APK. | `@claim:native-privacy`. |
| F-1-60 | Allowed request behavior is now observed through the VPN on the current emulator network. | `@claim:network-resolver`. |
| F-1-61 | Browser and Android privacy scopes stay separate; runtime assets remain self-hosted. | Browser request log; native privacy runtime. |
| F-1-62 | Real/demo browser databases and private Android settings storage remain named and tested. | Demo docs; browser and native privacy claims. |
| F-1-63 | Export downloads versioned JSON with all sample records. | `@claim:json-portability`. |
| F-1-64 | Installed-APK inspection finds configured settings and no browsing database. | `@claim:native-privacy`. |
| F-1-65 | Deployment-header marketing remains absent; real headers are configured. | Live header check. |
| F-1-66 | Compatibility promises about deployment files remain absent. | README search. |
| F-1-67 | Versioned precache excludes deployment controls and offline demo reload passes. | Precache test; `@claim:offline-demo`. |
| F-1-68 | MIT license ships at repository root and `/LICENSE.txt`. | `@claim:free-no-account`. |
| F-1-69 | Home h1 remains the six-word Android blocking job. | Route test; home screenshot. |
| F-1-70 | Empty state remains action-led. | Browser UI and copy audit. |
| F-1-71 | Limits heading directly names blocks and bypasses. | Heading outline/axe test. |
| F-1-72 | Footer remains factual and product-specific. | Shared skeleton route test. |
| F-1-73 | Labels remain concrete task/state names. | Copy audit. |
| F-1-74 | Section headings remain meaningful out of context. | Heading outline across routes. |
| F-1-75 | Web/native and import/export controls name their outcomes. | Web-config and portability claims. |
| F-1-76 | README h1 states the Android blocking job. | README inspection. |
| F-1-77 | Route metadata, canonical URLs, social image, favicon, and touch icon remain complete. | Route metadata test and live head check. |
| F-1-78 | Every route retains the shared header, footer, legal links, factory credit, and build id. | Route/axe test over seven URLs. |
| F-1-79 | Client navigation updates title, focus, announcement, history, and restored scroll. | `client routing updates title, focus, history, and the route announcement`. |
| F-1-80 | Sitemap retains all public routes. | Live `/sitemap.xml` check. |
| F-1-81 | Interactive targets remain at least 44 px at 390 px. | Mobile target-size test. |
| F-1-82 | Legal/offline routes keep task h1s and route metadata. | Route/axe test. |
| F-1-83 | External source link remains labeled as external. | Shared footer test and live link crawl. |
| F-1-84 | Three original Android walkthrough frames remain; demo now opens directly on the working sample. | Home screenshot, demo screenshot, F-2-1 browser test. |

## Result

No finding is deferred. The original pixel control-room identity, PWA/static deployment class, and Capacitor Android project are preserved.

Post-deploy cold checks found a 556.61 px demo-summary bottom at 390 × 844, 0 serious/critical axe findings, only same-origin requests, no console errors, working offline reload, and a styled HTTP 404. Live Lighthouse scored 100 in all four audited categories with 0.9 s LCP and 0 CLS.
