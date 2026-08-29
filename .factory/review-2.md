# Adversarial first-read review 2 — Quietwall

**Verdict: FAIL**  
**Reviewed:** 2026-08-29 UTC  
**Live URL:** https://android-site-blocker-private.sociobot.in  
**Source reviewed:** 2aeb47692a52d8d8296ae5f371a81c7c448dbb17

## Cold first read

I opened the live root in new Chromium contexts at 390 x 844 and 1440 x 900, with no stored data or service worker. I did not scroll before answering.

| Question | Answer from the first screen |
| --- | --- |
| What does this do? | It blocks selected websites across an Android device using a local block list. |
| For whom? | Android users who want device-wide blocking without an account or subscription. |
| What should I click first? | **Try it with sample data**; it says it will show four sample domains, focus hours, and a pause delay. |

The first-read answer is clear at both widths. All cold-browser requests were same-origin and no console error occurred.

## Findings

### F-2-1 — BLOCKING: demo opens above another marketing screen, not sample data

**Location/quote:** On mobile, immediately after selecting **Try it with sample data**, the demo top viewport contains the banner, landing h1, supporting sentence, both landing actions, and three facts. It contains no seeded domain, enabled rule, focus-hours value, pause-delay value, or configurator control. The promised sample is below the landing hero.

**Why a visitor is lost:** the required first screen after entering a one-click demo must already show the product in use with realistic sample data. At 390px, the visitor has clicked to try the product and is returned to another marketing view. The banner proves a mode changed, not that the tool works.

**Concrete fix:** make /demo/ and ?demo=1 land at #configure, or make a demo-specific first view. Show news.example.com, *.social.example, enabled/paused state, 21:30–07:00, and the 15-minute delay above the fold. Move focus to the configurator heading and add a 390px assertion that the banner and a sample rule are visible immediately after the CTA click.

### F-2-2 — BLOCKING: native claims are not proved by observable Android results

**Location/quote:** claims.json promises that the Android app returns a local not-found response after VPN consent, has no analytics/API/log store, uses the active-network resolver outside the VPN loop, filters only UDP DNS with no device-admin enforcement, and keeps filtering until the pause delay ends. Each command runs scripts/native-claims.test.mjs.

**Evidence:** those passing tests read Java and regex-match source. The Android DNS test checks for the text extends VpnService and DnsMessage.nxdomain. The resolver test checks text such as getDnsServers, protect(socket), and socket.connect. The privacy test only rejects source strings such as https://. None installs the published APK, accepts or cancels VPN consent, sends a matching packet through the VPN, observes an allowed resolver relay, or records runtime traffic/storage. An Android instrumentation test exists but no listed claim command runs it.

**Why a visitor is misled:** source-shaped tests cannot establish that the distributed APK does the promised job or makes no runtime request. The claim contract requires an observable outcome from clean sample data, not evidence that implementation words occur in source. These Android claims are therefore untested.

**Concrete fix:** have each affected claim command build/install the published APK on a clean emulator, use an app-scoped demo sample, grant VPN consent, and assert a matching DNS response. Assert selected active-network resolver and VPN-loop exclusion for allowed DNS. Capture egress and app storage during the flow; test the pause boundary; inspect the installed manifest for device-admin absence. Point the registry to those emulator tests.

### F-2-3 — Unlisted claim and jargon in the hero

**Location/quote:** hero caption: “Rules move from the local list to Android’s DNS filter.”

**Why a visitor is misled:** it asserts web-to-native rule transfer, but claims.json has no matching claim; android-dns-filter promises a different outcome. DNS filter is unexplained implementation jargon for the named Android audience. The page separately says the web cannot block traffic, so transfer timing matters.

**Concrete fix:** remove it, or write: “In the Android app, this list is used to block matching site requests.” Add an android-rule-sync claim and an emulator test that changes a real rule and observes the matching outcome.

### F-2-4 — checksum action is not plain language

**Location/quote:** first-screen secondary action: “Install the signed preview APK. Check its SHA-256.” The link is **Check its SHA-256**.

**Why a visitor is lost:** SHA-256 is unexplained jargon for the Android visitor named by the hero. The link names a mechanism, not the result a person receives.

**Concrete fix:** write: “Install the signed preview APK. Download the checksum to confirm the file did not change.” Rename the link **Download APK checksum**. Keep the checksum test.

### F-2-5 — README contains an unlisted build-behaviour claim

**Location/quote:** README.md line 53: “The native sync removes the website-only download directory so an APK never embeds an older APK.”

**Why this fails:** this is a concrete, reliance-worthy build behaviour with no claims.json entry. It is also internal build jargon in a README that begins for ordinary Android users.

**Concrete fix:** delete it from the public README, or add an apk-excludes-site-apk claim that runs cap:sync and inspects the generated APK for an absent nested download path. If kept, move it to a developer-build note.

## Demo and sandbox exercise

- I saved real personal.example, entered the live demo, and saw four realistic rules: news.example.com, *.social.example, video.example, and forum.example.
- The persistent banner says “Demo — sample data, nothing is saved to your real list.” After adding temporary.example, **Reset demo** removed it and restored the four sample rules. **Start for real** restored only personal.example.
- IndexedDB contained separate quietwall-demo and quietwall-local databases. During the real → demo → reset → real flow, every browser request was same-origin and no console error occurred.
- After the first online visit and service-worker control, live ?demo=1 reloaded offline and still displayed news.example.com.

These checks confirm isolation, reset, real-data protection, and browser privacy. They do not resolve F-2-1.

## Claims verification

I made a clean temporary clone at the reviewed commit, ran npm ci, npm test, npm run build, and every exact command in claims.json. npm test completed with 23 passes and one intentional mobile-only skip; the build emitted dist. No registered command failed.

| Claim ID | Result |
| --- | --- |
| demo-isolation | PASS — observable browser isolation/reset. |
| browser-privacy | PASS — observable same-origin and demo-database browser test. |
| offline-demo | PASS — observable offline demo reload. |
| json-portability | PASS — observable export/import. |
| free-no-account | PASS — browser/license check. |
| apk-download | PASS — package/checksum response. |
| apk-signature | PASS — repository certificate/checksum. |
| domain-matching | PASS — deterministic matcher. |
| focus-hours | PASS — deterministic schedule. |
| pause-delay | PASS command; source-contract only, see F-2-2. |
| web-config-only | PASS — browser limitation/error. |
| android-dns-filter | PASS command; source-contract only, see F-2-2. |
| native-privacy | PASS command; source-contract only, see F-2-2. |
| network-resolver | PASS command; source-contract only, see F-2-2. |
| filter-boundary | PASS command; source-contract only, see F-2-2. |

Separately, the live APK contained META-INF/CERT.RSA and its calculated SHA-256 matched the published 2e158dc7a296481e096cf36b5cd975f50b8fa176ba05e37b72e2716d32c32625 value.

## Copy audit

Counts treat hyphenated terms and identifiers as one word. No prose sentence exceeds 22 words. Headings name sections rather than moods. Findings from this audit are F-2-3, F-2-4, and F-2-5.

### Landing page sentences

| Words | Sentence | Audit |
| ---: | --- | --- |
| 6 | Block websites across your Android device | Clear h1. |
| 13 | For Android users who want private, device-wide blocking without an account or subscription. | Clear audience/outcome. |
| 10 | See four sample domains, focus hours, and a pause delay. | F-2-1: promised sample is not immediately shown. |
| 5 | Install the signed preview APK. | APK-signature claim. |
| 4 | Check its SHA-256. | F-2-4. |
| 7 | Your block list stays on this device. | Privacy claim. |
| 6 | Works offline after the first visit. | Offline claim. |
| 3 | Free to use. | Price claim. |
| 2 | No account. | Price claim. |
| 10 | Rules move from the local list to Android’s DNS filter. | F-2-3. |
| 6 | Add domains for Android to block | Clear section heading. |
| 9 | This website saves a block list for import. | Portability/config-only claim. |
| 8 | It does not block browser or device traffic. | Config-only claim. |
| 5 | example.com also blocks its subdomains. | Matcher claim. |
| 7 | *.example.com blocks subdomains, but not example.com. | Matcher claim. |
| 7 | Add a domain you want to block. | Clear empty state. |
| 10 | The Android app waits this long before a pause starts. | Pause claim; F-2-2. |
| 5 | Focus hours may cross midnight. | Focus claim. |
| 8 | Matching start and end times cover all day. | Focus claim. |
| 9 | Download the APK and allow installation from this source. | Direct instruction. |
| 8 | Enter each domain and choose optional focus hours. | Clear instruction. |
| 5 | Approve Android’s VPN prompt. | Native claim; F-2-2. |
| 7 | A status notification appears while blocking runs. | Native runtime assertion; F-2-2. |
| 16 | The Android app handles standard domain requests and returns a not-found response for matching entries. | Native claim; F-2-2. |
| 13 | Another VPN, encrypted DNS, direct IP links, or uninstalling the app can bypass this filter. | Boundary claim; F-2-2. |
| 11 | Allowed domain requests use the DNS service selected by your current network. | Resolver claim; F-2-2. |
| 8 | Android asks for VPN permission before blocking starts. | Native claim; F-2-2. |
| 8 | The website only prepares and exports your block list. | Config-only/portability claims. |
| 6 | Configure a private Android block list. | Clear footer one-liner. |

Result-naming controls are **Try it with sample data**, **Download the Android app**, **Save block list**, **Add domain**, **Import block list**, **Export block list**, **Reset demo**, and **Start for real**. The checksum link is the exception in F-2-4. Demo, Privacy, and Terms are destination links.

### README sentences

| Words | Line | Sentence | Audit |
| ---: | ---: | --- | --- |
| 10 | 3 | Quietwall blocks selected domains through a local Android DNS VPN. | Native claim; F-2-2. |
| 12 | 3 | It has no account, subscription, analytics client, or company-run DNS service. | Privacy/price claims; F-2-2 runtime scope. |
| 8 | 5 | The website prepares and exports a block list. | Portability/config-only claims. |
| 7 | 5 | It cannot block browser or device traffic. | Config-only claim. |
| 12 | 9 | Open /?demo=1 or select Try it with sample data on the first screen. | Clear instruction. |
| 14 | 11 | The sample includes four domains, overnight focus hours, and a 15-minute pause delay. | Live sample confirmed; F-2-1 hides it initially. |
| 9 | 11 | Demo changes use the separate quietwall-demo IndexedDB database. | Demo isolation claim. |
| 5 | 13 | Reset demo restores the sample. | Demo isolation claim. |
| 10 | 13 | Start for real returns to the separate quietwall-local database. | Demo isolation claim. |
| 4 | 17 | Use Node.js 20 or newer. | Developer prerequisite. |
| 7 | 24 | Open the local URL printed by Vite. | Developer instruction. |
| 16 | 33 | The test command runs unit, native-contract, service-worker, desktop, mobile, accessibility, privacy, and offline checks. | Developer documentation; command completed. |
| 9 | 33 | The build command writes the static site to dist. | Developer documentation; verified. |
| 14 | 35 | Each public product claim and its clean-state command lives in .factory/claims.json. | Accurate file pointer. |
| 11 | 39 | The repository includes a Capacitor Android project with app id in.sociobot.androidsiteblockerprivate. | Developer fact. |
| 10 | 41 | The Android app asks for VPN permission before blocking starts. | Native claim; F-2-2. |
| 10 | 41 | Matching standard DNS requests receive a local not-found response. | Native claim; F-2-2. |
| 5 | 43 | Bare domains include their subdomains. | Matcher claim. |
| 9 | 43 | An explicit wildcard such as *.example.com excludes the apex domain. | Matcher claim. |
| 9 | 45 | Focus hours support daytime, overnight, and all-day ranges. | Focus claim. |
| 10 | 45 | A pause delay keeps filtering active until its timer ends. | Pause claim; F-2-2. |
| 12 | 47 | Allowed DNS requests use the active network resolver outside the VPN loop. | Resolver claim; F-2-2. |
| 12 | 47 | Quietwall stores settings in private app storage and writes no browsing log. | Privacy claim; F-2-2. |
| 6 | 49 | Quietwall filters standard UDP DNS only. | Boundary claim; F-2-2. |
| 14 | 49 | Encrypted DNS, direct IP traffic, another VPN, or uninstalling the app can bypass it. | Boundary claim; F-2-2. |
| 12 | 51 | The website provides the signed preview APK and its SHA-256 checksum. | APK checks pass. |
| 13 | 51 | The preview uses Android’s generated debug certificate, not a release-store key. | Signature test passes. |
| 17 | 53 | The native sync removes the website-only download directory so an APK never embeds an older APK. | F-2-5. |
| 15 | 55 | To rebuild it, use JDK 21 and Android SDK Platform 35 with Build Tools 35.0.0. | Developer prerequisite. |
| 9 | 65 | The browser stores the real list in quietwall-local. | Browser privacy claim. |
| 6 | 65 | The isolated sample uses quietwall-demo. | Demo claim. |
| 7 | 67 | Quietwall has no account or analytics endpoint. | Privacy/price claim; F-2-2 runtime scope. |
| 9 | 67 | Export downloads a versioned JSON file that you control. | Portability claim. |
| 11 | 69 | Read the in-product privacy page and terms. | Clear link instruction. |
| 7 | 73 | Publish dist to the configured static host. | Developer instruction. |
| 7 | 73 | Do not deploy infrastructure from this repository. | Developer instruction. |
| 9 | 77 | Quietwall is free software under the MIT License. | Free/MIT claim. |

README headings — Try the isolated demo, Run locally, Test and build, Android app, Privacy and data ownership, Deploy, and License — all name their sections. There are no mood headings, banned marketing adjectives, inconsistent product names, or over-22-word sentences.

## Structure, routing, accessibility, and visual identity

- /, ?demo=1, /demo/, /privacy/, /terms/, /offline.html, and /404.html returned 200; /does-not-exist returned a designed Quietwall 404 with status 404 and a return action.
- Each rendered route has one h1, a main landmark, lang=en, a route title, description, canonical, favicon, and social-card metadata. The home title is Quietwall — block websites on Android.
- Privacy navigation updated title, moved focus to the h1, announced the route, and browser Back restored home. Header/footer are consistent and include Privacy, Terms, factory credit, and build id.
- Crawled internal content/download links returned 200 except the expected current-404 skip link; the external GitHub source link returned 200. Robots and sitemap are present.
- The 390px layout has no horizontal overflow, controls meet the 44px test, and the live page reports no console errors. The pixel control-room art, clipped forms, dark grid, lime gate signal, and original walkthroughs match design.md and are distinct from a generic SaaS template.
- No AI feature is implied by the brief; JSON import/export already exists. No missed-leverage finding is raised.

## Review-1 closure check

I read review-1.md, polish-1.md, every verification record, and the previous handoff, then checked live and source. Every earlier ID is confirmed below. “Registered; F-2-2” means the original missing-registry defect is fixed, while this round finds inadequate runtime evidence.

| Earlier IDs | Confirmation |
| --- | --- |
| F-1-1 | Verified: job h1, audience, and actions visible. |
| F-1-2 | Verified: demo/sample/banner/reset/real separation exist; F-2-1 finds first-screen failure. |
| F-1-3 | Verified: web says save list and cannot block; APK is public. |
| F-1-4 | Verified: styled same-origin 404. |
| F-1-5 | Verified: registry/tagged commands exist; F-2-2 reviews adequacy. |
| F-1-6 | Verified: metadata avoids zero-network-call claim. |
| F-1-7 | Registered; F-2-2. |
| F-1-8 | Verified: privacy/price claims split. |
| F-1-9 | Verified: metaphor removed. |
| F-1-10 | Verified: bare-domain copy/test. |
| F-1-11 | Verified: wildcard copy/test. |
| F-1-12 | Verified: useful empty state. |
| F-1-13 | Registered; F-2-2. |
| F-1-14 | Verified: unsupported assertion removed. |
| F-1-15 | Verified: midnight copy/test. |
| F-1-16 | Verified: all-day copy/test. |
| F-1-17 | Registered; F-2-2. |
| F-1-18 | Verified: standalone one-VPN assertion removed. |
| F-1-19 | Verified: bounded limits. |
| F-1-20 | Registered; F-2-2. |
| F-1-21 | Registered; F-2-2. |
| F-1-22 | Verified: concise consent wording. |
| F-1-23 | Verified: no web armed state. |
| F-1-24 | Verified: web limit/offline split. |
| F-1-25 | Verified: MIT/no-account path. |
| F-1-26 | Verified: provenance separated. |
| F-1-27 | Verified: factual labels. |
| F-1-28 | Verified: short README opening. |
| F-1-29 | Registered; F-2-2. |
| F-1-30 | Verified: native claims split. |
| F-1-31 | Registered; F-2-2. |
| F-1-32 | Verified: lifecycle overclaim removed. |
| F-1-33 | Verified: storage/offline/import/export split. |
| F-1-34 | Verified: web limit beside control. |
| F-1-35 | Verified: parental-control boundary. |
| F-1-36 | Verified: Node engine. |
| F-1-37 | Verified: Android prerequisites. |
| F-1-38 | Verified: Vite instruction. |
| F-1-39 | Verified: broad environment assertion removed. |
| F-1-40 | Verified: npm test suite. |
| F-1-41 | Verified: named browser/accessibility/privacy/mobile/offline tests. |
| F-1-42 | Verified: pinned Playwright guidance. |
| F-1-43 | Verified: clean build. |
| F-1-44 | Verified: route files emitted. |
| F-1-45 | Verified: Capacitor project/id. |
| F-1-46 | Verified: public signed preview/checksum. |
| F-1-47 | Verified: signing-process prose removed. |
| F-1-48 | Registered; F-2-2. |
| F-1-49 | Source/copy exists; F-2-2 needs runtime proof. |
| F-1-50 | Verified: restart detail removed. |
| F-1-51 | Verified: cancellation overclaim removed. |
| F-1-52 | Verified: bare matcher. |
| F-1-53 | Verified: wildcard matcher. |
| F-1-54 | Verified: packet jargon removed. |
| F-1-55 | Verified: blocked/allowed split. |
| F-1-56 | Verified: standalone VPN assertion removed. |
| F-1-57 | Verified: bounded other-VPN limit. |
| F-1-58 | Verified: concise bypass limits. |
| F-1-59 | Registered; F-2-2. |
| F-1-60 | Registered; F-2-2. |
| F-1-61 | Verified: browser/native split and same-origin browser log. |
| F-1-62 | Verified: storage namespaces named. |
| F-1-63 | Verified: JSON export action/test. |
| F-1-64 | Registered; F-2-2. |
| F-1-65 | Verified: header marketing removed. |
| F-1-66 | Verified: compatibility promise removed. |
| F-1-67 | Verified: deployed precache/offline reload. |
| F-1-68 | Verified: shipped MIT license. |
| F-1-69 | Verified: job h1. |
| F-1-70 | Verified: useful empty state. |
| F-1-71 | Verified: meaningful Limits heading. |
| F-1-72 | Verified: factual footer. |
| F-1-73 | Verified: concrete labels. |
| F-1-74 | Verified: heading outline. |
| F-1-75 | Verified except checksum wording in F-2-4. |
| F-1-76 | Verified: README job title. |
| F-1-77 | Verified: metadata/social/favicon. |
| F-1-78 | Verified: shared header/footer. |
| F-1-79 | Verified: title/focus/announcement/history. |
| F-1-80 | Verified: sitemap. |
| F-1-81 | Verified: mobile target/overflow test. |
| F-1-82 | Verified: legal/offline metadata. |
| F-1-83 | Verified: labelled reachable external source. |
| F-1-84 | Verified: original three-frame walkthrough. |

## What would make this perfect

Open the demo on a visible realistic configured list; verify the published Android artifact end to end through registered emulator claim tests; remove or register the two unlisted claims; and replace checksum jargon with a plain result-naming action. Then rerun this whole checklist from a fresh context.

