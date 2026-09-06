# Verify private website blocking on Android — round 5

## Verdict: FAIL

**Work order:** `android-site-blocker-private-verify-5`

**Verified:** 6 September 2026 UTC

**Live URL:** <https://android-site-blocker-private.sociobot.in>

**Implementation candidate:** `ba3701dc2a1d69ce0b5dbc52ade8d5fd32a18126`

**Documentation and test harness reviewed:** `7be7e85b9f5b30a8ae620725e3b3673355506a2b`

The implementation SHA is the last commit that changed a shipped product artifact: the public APK. Later commits through `7be7e85` change tests, CI, claims records, and reports. The generated web shell at `7be7e85` is byte-for-byte equal to the live shell.

**Finding count:** 5. **Untested claim count:** 5. These are verification gaps, not observed product failures. Three fresh API 35 workers failed before the Android claim registry started.

## First screen before scrolling

Fresh Chromium contexts used 1440 × 900 and 390 × 844 viewports.

| Question | Answer visible before scrolling |
| --- | --- |
| What is the job? | Block websites across an Android device. |
| Who is it for? | Android users who want private, device-wide blocking without an account or subscription. |
| What is the first action? | **Try it with sample data**. The adjacent text says it opens four domains, focus hours, and a pause delay. |

The Android APK download and checksum action are also visible at both sizes. The demo action ends at 788 CSS px on desktop and 478 CSS px on mobile. Evidence: `.factory/evidence/verification-5/home-desktop.png`, `home-mobile.png`, and `live-browser.json`.

## Clean checkout and build

A new clone at `7be7e85` was created outside the working tree.

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 172 packages installed; 0 vulnerabilities. |
| `npm test` | PASS — 12 Vitest, 2 DNS fixture, 6 native contract, 1 precache, and 26 browser tests passed; 2 project-specific skips. |
| `npm run build` | PASS — `dist/` contains the home, demo, privacy, terms, offline, and 404 pages. |
| `npm run cap:sync` | PASS — production web files copied into the Capacitor Android project. |
| `./gradlew test assembleDebug --no-daemon` | PASS with JDK 21 and Android SDK 35 — 18 JVM tests passed across debug and release; 143 tasks completed. |
| Live Playwright suite | PASS — 26 tests passed against the public URL; 2 project-specific skips. |
| Factory `verify-url.sh` | PASS — title, `lang=en`, one h1, main landmark, image alt text, buttons, and console. |

The production bundles are 32,467 bytes of JavaScript (11,728 bytes gzip) and 17,260 bytes of CSS. The hero WebP is 7,406 bytes. No font file is loaded.

## Declared claims

Every non-Android command below was run exactly as declared in `.factory/claims.json` from the clean checkout after the clean production build. Those ten commands passed. Three clean API 35 workflow attempts at `7be7e85` failed while the emulator runner was booting, before any Android claim command started. A successful older run is useful historical evidence but does not satisfy this work order's fresh-evidence requirement.

| Claim | Result | Observable evidence |
| --- | --- | --- |
| `demo-isolation` | PASS | A saved real rule survived demo edits, reset, and exit. |
| `browser-privacy` | PASS | Direct demo entry opened only `quietwall-demo`; captured requests were same-origin. |
| `offline-demo` | PASS | The seeded sample reloaded with the browser offline and a controlling service worker. |
| `json-portability` | PASS | Exported version-1 JSON contained four rules; a version-1 fixture imported. |
| `free-no-account` | PASS | No auth or payment path appeared; the shipped MIT license loaded. |
| `apk-download` | PASS | The public response is an APK and the checksum file is present. |
| `apk-signature` | PASS | The repository APK is signed and matches its published SHA-256. |
| `domain-matching` | PASS | Apex, nested subdomain, wildcard, excluded apex, and lookalike cases passed. |
| `focus-hours` | PASS | Daytime, overnight, boundary, and equal-time all-day cases passed. |
| `web-config-only` | PASS | The web UI says it saves a list and does not claim to block traffic. |
| `network-resolver` | UNTESTED | API 35 runner failed before the command started. |
| `android-dns-filter` | UNTESTED | API 35 runner failed before the command started. |
| `native-privacy` | UNTESTED | API 35 runner failed before the command started. |
| `filter-boundary` | UNTESTED | API 35 runner failed before the command started. |
| `pause-delay` | UNTESTED | API 35 runner failed before the command started. |

The live APK, repository APK, and published checksum all equal `4e0fca19c1719a86e29db74f328377d258b91ab7e57f5a0ba9ccaf0728d05b34`.

## Demo and user paths

- One click from the home page opens `/?demo=1`, focuses **Try a sample Android block list**, and shows all four named rules, three enabled states, one paused state, 21:30–07:00 focus hours, and a 15-minute pause delay within 844 CSS px.
- The persistent demo notice remains in the demo document after edits and reset. **Reset demo** removes an added domain and restores the four samples. **Start for real** returns to the unchanged real list.
- Normal URL input becomes `example.com`. Duplicate and malformed input produce specific recovery text. The delay boundary clamps to 1,440 minutes.
- Canceling removal leaves the rule in place. Confirming removal and selecting **Undo removal** restores it.
- Versioned import/export, refresh persistence, route back navigation, heading focus, and route announcement pass in the live suite.
- A forced IndexedDB-open error renders `STORAGE ERROR` and the specific storage message without a page error.

No server tenant, database, health endpoint, or application rate limiter exists because this is a static PWA plus a downloadable Android app. Backend tenant isolation, restart persistence, and HTTP 429 checks do not apply. Browser persistence, Android private storage, and offline recovery are covered instead.

## Accessibility and responsive behavior

- Axe reported zero violations of any severity on home, demo, privacy, terms, and the designed 404 at desktop and mobile widths.
- Every route has `lang=en`, one h1, a main landmark, shared header/navigation/footer, and a skip link.
- Keyboard traversal shows a 3 px focus outline, skips the hidden file input, and has no trap. Native checkboxes expose names and state.
- The 390 px tests find no horizontal overflow and no visible interactive target below 44 × 44 CSS px.
- Reduced motion changes transitions and animations to `0.01ms`; keyboard focus remains visible in that mode.
- Images have useful alt text. Forms have labels and live error regions. Native browser confirmation provides the destructive-action dialog behavior.

## Offline, update, privacy, and performance

- The live service worker controls the demo and reloads it offline with sample data intact.
- A clean two-version local service-worker check produced a waiting worker and the visible **Quietwall has an update / Reload update** notice.
- Automatic requests during home, demo, editing, reset, and offline checks used only the product origin. There is no analytics, advertising, external font, runtime API, or company DNS endpoint.
- Live response headers include self-only CSP, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, restrictive Permissions Policy, and HSTS. Hashed assets are immutable for one year. The manifest uses `application/manifest+json`.
- Live and generated hashes match for the home page, service worker, manifest, privacy page, terms page, 404 page, and main JavaScript.
- Fresh mobile Lighthouse: 100 performance, 100 accessibility, 100 best practices, 100 SEO; FCP 1.01 s, LCP 1.01 s, CLS 0, total blocking time 48.5 ms.

## Routes, links, and 404

Home, query demo, `/demo/`, privacy, terms, offline, robots, sitemap, license, APK, and checksum return HTTP 200. Every rendered internal and external link resolves. Titles and canonicals match each route. `/does-not-exist` deliberately returns HTTP 404 while rendering the Quietwall page, one h1, navigation, footer, and a return link. Chromium logs the expected failed-document 404 for that navigation; this is not a defect.

## Earlier finding disposition

All earlier reports were read, including low-severity notes.

| Earlier finding(s) | Current disposition and fresh evidence |
| --- | --- |
| Verification 1 hidden import focus | CLOSED — `#import-file` has `tabindex=-1`; live keyboard traversal never stops there and every visible stop has the designed focus ring. |
| Verification 2 missing Android blocker | CLOSED AS PACKAGING — the signed public APK contains the VPN service and current JVM/package checks pass. Fresh runtime outcomes remain open as V5-1–V5-5. |
| Verification 2 cache policy, anti-framing/CSP, and manifest MIME | CLOSED — live headers and MIME now match the required values. |
| Verification 3 broken service-worker install | CLOSED — live control and offline reload pass; deployment-control files are absent from the precache. |
| Verification 3 native coverage, Lighthouse variability, and inaccurate “no network calls” text | PARTIAL — installed-APK commands replace source-only checks, Lighthouse is 100, and copy names allowed DNS traffic. Fresh execution of those Android commands remains open as V5-1–V5-5. |
| Verification 4 Android device coverage gap | OPEN — three fresh API 35 attempts failed before claim execution, so the five installed-APK claims remain untested in this round. |
| Review 2 F-2-1 | CLOSED — the demo sample summary ends at 556.61 CSS px in the first 390 × 844 viewport. |
| Review 2 F-2-2 | NOT REPROVEN — the harness still targets the checksum-verified public APK, but no fresh API 35 attempt reached it. |
| Review 2 F-2-3 | CLOSED — the unlisted rule-transfer sentence is absent. |
| Review 2 F-2-4 | CLOSED — the action says **Download APK checksum** and explains its purpose. |
| Review 2 F-2-5 | CLOSED — the unlisted native-sync build sentence is absent from README. |
| Review 1 F-1-1–F-1-4 | CLOSED — first action, isolated demo, truthful web state, public APK, and designed 404 all pass live. |
| Review 1 F-1-5–F-1-27 | CLOSED — the claims registry covers current landing and metadata claims with observable browser, package, and Android tests. |
| Review 1 F-1-28–F-1-68 | PARTIAL — assertions were removed, narrowed, or mapped to 15 commands. Build, browser, package, and license evidence is current; five Android runtime commands remain untested. |
| Review 1 F-1-69–F-1-76 | CLOSED — current h1, headings, controls, empty state, footer, and README use direct task language. |
| Review 1 F-1-77–F-1-84 | CLOSED — metadata, shared skeleton, focus/history, sitemap, 44 px targets, legal/offline pages, external-link label, and three-step walkthrough pass. |

The old handoff cited workflow `33241895723` as successful even though its overall result was failure at the DNS preflight. A later run at the same shipped APK, `33243763594`, did pass all five native claims. This report does not rely on that older run; it records the fresh attempts below.

## Fresh Android runs

All three runs used commit `7be7e85` and completed the clean build job successfully. Their device jobs failed inside `reactivecircus/android-emulator-runner` before `node scripts/run-claim-registry.mjs` started:

- [Run 34003372436](https://github.com/B-Divyesh/sf-android-site-blocker-private/actions/runs/34003372436): the emulator reported boot complete, then the wrapper's input key event failed with `Broken pipe (32)`.
- [Run 34004101437](https://github.com/B-Divyesh/sf-android-site-blocker-private/actions/runs/34004101437): the same wrapper input and overlay setup failed with broken pipes.
- [Run 34006155513](https://github.com/B-Divyesh/sf-android-site-blocker-private/actions/runs/34006155513): the wrapper timed out waiting for the emulator to boot.

The last known successful installed-APK run, [33243763594](https://github.com/B-Divyesh/sf-android-site-blocker-private/actions/runs/33243763594), used the same published APK at documentation/test commit `73f374e`. It does not replace fresh evidence for this work order.

## Findings

| ID | Severity | Finding | Required evidence to close |
| --- | --- | --- | --- |
| V5-1 | High | `network-resolver` is untested in this round. | Run its exact command on a clean, booted API 35 device and observe an allowed reply through the active network resolver. |
| V5-2 | High | `android-dns-filter` is untested in this round. | Run its exact command against the published APK and observe the local not-found result. |
| V5-3 | Medium | `native-privacy` is untested in this round. | Run its exact command and inspect app egress and private runtime storage. |
| V5-4 | Medium | `filter-boundary` is untested in this round. | Run its exact command and inspect installed package authority and permissions. |
| V5-5 | Medium | `pause-delay` is untested in this round. | Run its exact command and observe filtering before and after delay expiry. |

No browser, accessibility, privacy, performance, route, build, package, or live-output defect was found. The deliberate designed HTTP 404 is expected and is not a finding.
