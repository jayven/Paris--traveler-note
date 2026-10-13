# First development audit — 12 October 2026

## Baseline and scope

Read `AGENTS.md`, `PRODUCT_BRIEF.md`, all six app/source files, manifest and existing setup instructions before implementation. The folder provided in chat was renamed: the actual repository is `/Users/jayven/Desktop/Project/Paris--traveler-note`, with GitHub remote `jayven/Paris--traveler-note` and baseline commit `c48dd78`. The pre-existing staged handoff documents are preserved.

Read-only comparison of live `index.html`, `styles.css`, `app.js`, `trip-data.js`, `sw.js` and manifest matched the local baseline (ignoring Netlify's injected hosting comment in HTML). No deployment, Git push, Netlify settings change or new site was performed.

This is an appropriate small static app: data is structured, activity IDs are stable, user-entered text is escaped, and Leaflet is loaded only when needed. No framework rewrite or backend is needed for this slice.

## Findings and prioritized plan

| Priority | Evidence / problem | Improvement and status |
| --- | --- | --- |
| 1 — personal data and functional editing | Original storage reader discarded unrecognized fields; import assigned unchecked data into live state. Save errors did not stop a subsequent success message. Activities were only editable in source. | **Implemented:** additive ID-keyed overrides, validated backup/storage module, storage failure protection, editable time/end/description, cancel and single-activity reset. Next: concurrent-window protection and recovery UI for malformed data. |
| 2 — safe offline releases | Original worker used network-first JS/CSS, cache-first icons, immediate skipWaiting/claim and unconditional controllerchange reload. This could mix releases, overwrite editor input and delete unrelated caches. | **Implemented:** complete versioned shell, waiting update with explicit button, no automatic first-install reload, no update while editor open, cleanup limited to owned cache prefix. Next: physical iOS lifecycle/background/multiple-window testing and visible offline readiness. |
| 3 — iPhone usability and broader editing | Several map/actions controls were 30–36px high; note fields were 11–12px. No editing interface, reordering or compact day overview. | **Implemented:** native modal with labels/errors, 16px fields and >=44px action controls, preserved multiline descriptions. Next: edit location and booking info, add/delete/reorder by stable ID, collapsible details and four booking statuses. |
| 4 — map and itinerary trust | Pending Leaflet loads could each render an obsolete day into the latest map target. CDN failure already had a list fallback, but tile failure after engine load has no separate status. Venue center/dock suggestions and opening-hour statements lack structured provenance. | **Implemented:** stale async requests ignored, original Tuileries center retained, offline list/navigation tested, unsupported “all coordinates checked” fallback claim removed. Next: tile-error notice, online retry cleanup, center/entrance/pickup metadata and source/last-checked records; verify seasonal details against official sources before travel. |
| 5 — ongoing delivery | Remote exists, but there were no package scripts, automated tests, CI or documented GitHub-to-existing-Netlify review process. Hosting connection settings are not known. | **Implemented:** Node-only dev server, storage/data tests, Playwright UI/offline/update tests, pinned development dependency/lockfile and README. Next: CI checks and an authorized deploy-preview/production workflow using the same site. |

## Data accuracy

`trip-data.js` is unchanged. The 8 dates, Paris timezone, 08:00 arrival, 22:20 departure, stable IDs and place/booking references pass structural checks. Tuileries remains 48.8635, 2.3274. These are code consistency checks, not external verification of future opening hours, holiday schedules, coordinates of entrances or ticket availability. Existing factual claims remain planning data pending official-source review. No reservation or additional travel fact was invented.

Editing a flight-related activity displays a warning that trip flight metadata does not change. Editing a booked activity leaves its booking ID, checkbox and booking note intact. Times remain planning times, and changing a time does not reorder activities. Bookings still use the original binary checkbox rather than planned/reserved/confirmed/canceled statuses; the static booking date text is not rewritten when an activity time changes.

## Changed files

`app.js`, `index.html`, `styles.css`, `sw.js`; new `personal-data.js`, `package.json`, `package-lock.json`, `.gitignore`, `scripts/serve.cjs`, `tests/personal-data.test.cjs`, `tests/browser.cjs`, `tests/pwa.cjs`, `tests/fixtures/legacy-sw.js`, `README.md`, and this report. Original content, coordinates, manifest, icons and existing personal storage key are retained. The old worker fixture makes the upgrade regression reproducible.

## Verification report

- Node tests: **7 passed**. Legacy data migration, storage reload, edit backup round trip, old/new backup behavior, malformed/future schemas, storage denial/quota failures, flexible/invalid times, and canonical data integrity.
- Chromium using installed Chrome and Playwright: **passed** real editing/reload; text escaping; cancellation/validation; exported JSON/import/reset; old backup compatibility; malformed imports; quota/corrupt-storage protection; existing notes and bookings; widths 320, 375, 390, 430 and 1024; offline edit/reload; map fallback and all main tabs. No uncaught page JavaScript errors.
- PWA upgrade regression: **passed** original worker → new waiting worker, draft preserved during update availability, explicit update after saving, localStorage preserved, unrelated cache retained, new offline shell available, and an incomplete update leaving the previous working shell usable offline.
- Syntax checks and `git diff --check`: **passed**. Editor screenshot inspected at iPhone-sized viewport; save/cancel alignment refined.

Physical iPhone Safari, keyboard/VoiceOver, installation and iOS background/update behavior are **not yet verified**. Online map tiles and routing/entrance accuracy were not independently verified. No CI/Netlify account settings were inspected or changed. The README contains local and iPhone verification steps and the safe review/deployment path.

## Remaining limits

Data is local per browser/origin, without two-device sync or multi-window conflict detection. If note autosave fails, text remains visible until navigation; it is not persisted, so the error must be addressed before leaving. Invalid stored data disables writes, including imports, to protect original bytes; a user-controlled raw-data recovery tool is future work. Imported backups replace notes/bookings after confirmation; the UI advises exporting first but does not create a second automatic snapshot. Personal overrides take priority over later base itinerary updates until individually reset; future work should make those conflicts visible.

An installed original client may need an online refresh to receive the new update interface. Later releases must always change `CACHE_VERSION` and publish the full shell. Rolling back to the original app ignores new override fields and may discard them on its next write; keep a new-format backup before any rollback. These limitations are explicit rather than silently resetting existing data.


## V1.1 continuation — agreed roadmap and implementation

Requirements in AGENTS.md and PRODUCT_BRIEF.md now specify V1.1 editable itinerary, V1.2 Google Maps URLs with embedded map and walking/driving, V1.3 hotel/restaurant/bookings, and V2.0 two-person/multi-device synchronization. ChatGPT owns product/itinerary requirement collaboration; Codex implements and tests. Major visual redesigns remain separately requested work. Existing GitHub/Netlify and deployment approval rules remain in effect.

Implemented V1.1 activity creation with stable user IDs; title/date/time/description edits; moving between agreed trip days; explicit up/down order; confirmed, recoverable deletion; original-activity reset; and full backups. Canonical itinerary, known flight facts, coordinates, booking references and personal notes remain intact. Day maps project from the edited activity lists. Added itinerary-data.js for pure operations and schema 3 management fields in personal-data.js. Original/schema-2 data migrates; older backups merge supported edits and keep V1.1 additions/moves/deletions/order. New backups fully replace personal itinerary after confirmation.

Added optimistic stale-window write rejection and a storage-event warning with explicit reload; this is local conflict protection, not cross-device synchronization. Corrected service-worker installed-event/update-banner timing and stopped Leaflet map animations/removed instances before replacing a map target after rapid day-filter changes. Styling additions use the existing buttons, modal and journal layout.

Verification: 16 Node tests passed; existing editing/storage/layout/offline regressions passed; new management browser tests passed add/cancel/edit/move/reorder/delete/restore, schema-2 migration, retained bookings/notes, edited-date map lists, full backup restore, offline editing/order/reload and stale-tab protection. PWA upgrade tests passed original-worker migration, explicit updates, draft preservation and failed-update fallback. No uncaught page errors in passing browser runs. Screenshots inspected at phone sizes. Physical iPhone Safari/keyboard/VoiceOver and Google Maps handoff remain unverified; Google navigation itself remains the V1.2 milestone. No production deploy or Git push.

The original audit above is historical. Its missing activity management and lack of stale-tab protection are now addressed as described here. The same private-data/rollback cautions and per-origin storage limits remain. Changing global travel dates and real flight details, rich location/booking management and synchronization remain outside this V1.1 activity slice.


## Google Maps external navigation slice

Switched all external location/direction links in itinerary cards, embedded Leaflet popups and map lists to Google Maps universal HTTPS URLs. Added walking/driving options through map-links.js. Existing coordinates and embedded map remain intact; no Place IDs, addresses or entrances were invented, and no paid API/key was added. Offline map failure retains the Google links and place list. Bumped the service-worker cache and cached the new helper. Google app/browser handoff uses the documented universal URL behavior but requires physical iPhone verification.

Verification: all 20 Node tests passed, including coordinate fidelity, walking/driving parameters, optional Place ID encoding and invalid-input rejection. Browser regression passed Google controls in the offline place list with no Apple map links; existing editing/backup/layout checks and original-worker/new-shell/failed-update PWA regressions also passed. No physical iPhone app handoff test or production deployment was performed.
