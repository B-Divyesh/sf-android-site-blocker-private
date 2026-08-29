# Handoff — adversarial review 2

## Outcome

Review only; no product code, assets, configuration, or deployment settings were changed. review-2.md records a **FAIL** with two blocking findings and three additional copy/claim findings.

## What was verified

- Fresh live Chromium contexts at 390 x 844 and 1440 x 900; same-origin browser requests and no console errors.
- Landing first read identifies job, audience, and first action.
- Live demo isolation: sample rules, banner, reset, separate IndexedDB namespaces, real-list preservation, and offline reload.
- Live routes, 404, metadata, route navigation/focus, links, robots, sitemap, APK download, and published APK checksum.
- A fresh temporary clone at 2aeb47692a52d8d8296ae5f371a81c7c448dbb17: npm ci, npm test, npm run build, and all 15 claims.json commands completed successfully.
- Earlier review/polish/verification/handoff records were read; every F-1 item is checked in review-2.md.

## Remaining work

1. Open the demo at a visible configured sample list on mobile and add a first-viewport assertion.
2. Replace source-regex Android claim checks with clean emulator/APK runtime tests and request/storage evidence.
3. Resolve the unlisted hero/README claims and checksum wording listed in the review.

## How to verify after repair

Run npm ci, npm test, and npm run build. Then run each command in claims.json, repeat the live mobile demo from a fresh context, and rerun the complete review checklist.
