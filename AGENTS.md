# Paris Pocket — Repository Instructions

## Product contract
- Maintain **Paris Pocket / 巴黎手帐**, a Chinese-first, mobile-first PWA for a two-person Paris trip, 7–14 December 2026.
- Preserve the existing production origin `https://stirring-cheesecake-37698e.netlify.app/` (do not create a replacement Netlify site as part of code edits).
- Prioritize an excellent iPhone Safari / Add to Home Screen experience, accessibility, usability, performance and reliability.
- The itinerary is **planning data**, not proof of booked tickets or hotel reservations. Never imply tentative times are confirmed.
- All itinerary times are in `Europe/Paris`. Arrival: CDG 2026-12-07 08:00; departure: CDG 2026-12-14 22:20.
- First Paris visit, two travelers. Preferences: 50% classic attractions and 50% Paris neighborhoods/food/shopping; Versailles is mandatory; mainly taxis, walking between nearby attractions; hotel TBD, Hilton/Hyatt free-night awards and Amex FHR are considerations.

## Existing project
- `index.html`, `styles.css`, `app.js`: vanilla front end.
- `trip-data.js`: canonical itinerary, locations, bookings and trip details. Read it before changing itinerary content.
- `manifest.webmanifest`, `sw.js`, `assets/`: installed PWA and offline support.
- Browser localStorage currently holds user booking checkboxes and notes (`paris-pocket-personal-v1`). Preserve and migrate these keys if refactoring. Provide export/import before destructive changes.
- `personal-data.js` validates/migrates personal storage and backups; local changes must overlay the canonical itinerary without rewriting it.
- Keep an embedded itinerary map. Leaflet/CDN and online tiles are the current implementation. Google Maps HTTPS URLs are now the default external location/directions provider, with walking/driving links. `map-links.js` centralizes URL construction; keep the embedded map and existing location coordinates.

## Engineering boundaries
- Work incrementally. Avoid a full framework rewrite unless justified by a practical need and agreed upon.
- Keep trip content in a structured, easily edited data layer, separate from UI, and use stable IDs for places, days and bookings.
- Preserve correct geolocations, particularly Tuileries Garden (center at 48.8635, 2.3274). Venue center coordinates must not be misrepresented as entrances, tour meeting points or taxi pickup locations.
- Prefer a small number of well-tested improvements to a wide but unfinished rewrite.
- Support iPhone Safari with touch-friendly controls, accessible labels, responsive layouts and browser storage failure handling.
- When editing or adding local persistence, use backwards-compatible migrations and test reload/offline/update scenarios.
- If an activity is moved or edited, associated notes and booking state must stay attached to its stable ID.
- Do not add secrets, API credentials, personal travel confirmation numbers or paid services to source control.
- Before declaring completion: run the app, test major flows, report changed files, remaining known issues and manual checks on iOS.
- Do not auto-deploy to production or alter Netlify settings without explicit authorization. Use a branch/PR for review when connected to GitHub.

## Agreed development roadmap
- **V1.1 — Editable itinerary:** add, edit, delete and reorder activities; edit activity dates, times and descriptions; persist safely with compatible migrations, stable IDs, recoverable deletion and backup/restore. Activity dates initially stay within the agreed trip dates; changing the trip dates/flight facts is a separate explicit product decision.
- **V1.2 — Maps and navigation:** retain an embedded itinerary map; Google Maps is the default external map/navigation provider, with walking and driving options.
- **V1.3 — Hotel, restaurant and booking management.**
- **V2.0 — Multi-device and two-person synchronization:** plan architecture/privacy/cost before adding authentication or a backend.

## Google Maps requirements (V1.2)
- Use Google Maps URLs for external location viewing and directions, not Apple Maps by default. Keep the embedded itinerary map inside Paris Pocket; it need not use Google's paid map SDK.
- Provide walking and driving navigation options. Do not invent routes or travel durations.
- Use verified coordinates, addresses or Google Place IDs and retain verification sources; distinguish venue centers from entrances, meeting points and pickup locations. Never guess a Place ID.
- Open Google Maps on iPhone when supported using app-compatible HTTPS URLs, with browser fallback. OS/app availability controls handoff; do not promise that every link launches the app.
- No paid Google Maps API integration unless necessary and explicitly approved. Do not add API keys or paid services as part of URL-based navigation.

## Product collaboration and scope
- ChatGPT primarily defines functionality and maintains travel itinerary requirements.
- Codex owns technical implementation, migrations and testing, following this product contract.
- Discuss visual design, aesthetics and animations separately. Do not introduce major visual redesigns unless requested; small functional controls may use the existing styles.
- Preserve existing personal data across all app updates and schema changes; continue with `jayven/Paris--traveler-note` and the existing Netlify site.

## Product priorities
1. Reliable, pleasant mobile UX with an itinerary that is easy to read **and edit**, rather than hard-coded UI.
2. Robust booking statuses and notes, backup/restore and protection of existing local data.
3. Accurate day-specific maps, proper destination versus entrance/pickup distinctions, Google Maps URL handoff in V1.2.
4. Simple maintainability and updates via GitHub -> same Netlify site; proper PWA cache updates.
5. V2.0 multi-device and two-person sync, with explicit trade-off/authorization before adding authentication or a backend.

See `PRODUCT_BRIEF.md` for detailed context, acceptance criteria and implementation phases.
