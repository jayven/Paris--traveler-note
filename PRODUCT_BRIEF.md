# Paris Pocket / 巴黎手帐 — Codex Handoff Brief

## 1. Goal
Turn the current working travel-itinerary prototype into a trustworthy, polished, iPhone-first **personal travel app**. Preserve the content, existing website address and user data, and improve the app through small reviewable iterations. This is NOT a request to generate a separate redesign or throw away the existing code.

Live URL (already deployed by user): https://stirring-cheesecake-37698e.netlify.app/
Current package: this repository, originally created as a static PWA.

## 2. Users and trip constraints
- Two adults, first trip to Paris, December 7–14, 2026 (7 nights / 8 calendar days).
- Land at CDG at 08:00 on Monday 7 December; depart CDG at 22:20 on Monday 14 December.
- Mainly taxis, except severe traffic, with walking within compact sightseeing areas.
- Equal interest in classic sights and Paris neighborhood life, cafes, restaurants and shopping.
- Versailles is non-negotiable; Louvre should allow **2–3 hours with a guided group plus 1–2 hours additional self-guided viewing**, for about 4–5 hours total.
- Hotel is undecided. Prioritize flexibility for Hilton Honors / Hyatt free-night certificates, points, and Amex Fine Hotels + Resorts.
- Winter sunset is around 17:00. Avoid packing the day to exhaustion. Museum closure days and opening hours matter. Booking/availability information can change and should carry a last-checked date/source where factual claims are made.

## 3. Planned itinerary — editable, not booked
| Date | Theme | Key stops |
| --- | --- | --- |
| Mon 12/7 | Arrival / Christmas in Paris | Place Vendôme, Rue Saint-Honoré, Tuileries Christmas market |
| Tue 12/8 | Historic center / Left Bank | Sainte-Chapelle, Notre-Dame outside/conditional interior, Saint-Germain-des-Prés, Luxembourg Garden |
| Wed 12/9 | Louvre + covered passages | Louvre guided tour & self-paced visit, Palais Royal, Galerie Vivienne |
| Thu 12/10 | Impressionists + Eiffel | Musée d'Orsay, Trocadéro, Eiffel Tower, Seine cruise |
| Fri 12/11 | Versailles all day | Château de Versailles palace, gardens if weather allows, Grand/Petit Trianon |
| Sat 12/12 | Montmartre and holiday shopping | Sacré-Cœur, Place du Tertre, Palais Garnier, Galeries Lafayette |
| Sun 12/13 | Le Marais + panorama | Place des Vosges, shops/cafes, Arc de Triomphe, Champs-Élysées |
| Mon 12/14 | Flexible final day | Brunch/shopping; hotel checkout, taxi to CDG, 22:20 flight |

The `trip-data.js` source contains tentative hourly schedules, detailed place records, booking priorities, and notes. Treat it as the source of truth unless the user supplies an update. Do not invent reservations or flights beyond the timing details above.

### Known location issue to preserve as fixed
The earlier itinerary map wrongly plotted Tuileries Garden. It was corrected to approx. 48.8635, 2.3274 (garden center). Maintain distinct location types for point-of-interest, attraction entrance, meeting spot, market entrance, and taxi pickup when available. If the precise entrance is unknown, clearly label it as unverified rather than guessing.

### Important visitor caveats
- Louvre: After leaving, re-entry on the same ticket generally is not allowed; any mid-day cafe break should be **inside** if continuing the visit.
- Notre-Dame on 12/8 may have holiday-specific religious services and altered access; interior is tentative.
- Versailles gardens in winter have a different appeal and possible closures; visiting the palace and Trianon remains a priority.
- Arrival-day early check-in is not confirmed. Departure-day plan should allow ample airport time and avoid nonrefundable late-afternoon activities.

## 4. Existing app architecture
The repository includes:
- `index.html`: entry markup / navigation;
- `styles.css`: layout and responsive styles;
- `app.js`: itinerary rendering, tabs, booking checkboxes, local notes, Leaflet map, import/export;
- `trip-data.js`: canonical itinerary and coordinates, exposed as `window.PARIS_TRIP`;
- `personal-data.js`: validated personal storage, compatible migration and backup/restore;
- `itinerary-data.js` (V1.1): pure activity projection and management operations using stable IDs;
- `manifest.webmanifest`: home-screen PWA metadata;
- `sw.js`: offline cache;
- `assets/`: touch icons.

Storage: localStorage key `paris-pocket-personal-v1`. Existing users may have real notes and booking checkboxes on the current production origin. **Never silently lose or reset these when updating the code.**

## 5. Agreed development roadmap

### V1.1 — Editable itinerary (current implementation milestone)
- Add, edit, delete and reorder activities directly on an iPhone.
- Edit activity titles, dates, start/end times and descriptions. Date changes move activities between trip days; this does not change the agreed December 7–14 trip dates or confirmed flight facts.
- Use touch-friendly reorder controls that do not depend on drag-and-drop; keep user-selected order rather than silently sorting by time.
- Preserve the base itinerary as a recoverable reference. Keep stable IDs for original and custom activities, preserve linked booking notes/states when moving or deleting, and make deletion recoverable with confirmation and restore.
- Persist all activity operations safely across reloads and offline use. Validate migrations and imports; reject failed saves and stale writes without claiming success or overwriting existing data.
- Backups must include custom activities, edits/date moves, deleted IDs and per-day order, and remain compatible with original notes/booking backups and the earlier time/description editor.
- Keep the existing visual design. Add only the controls needed for this functionality.

### V1.2 — Maps and navigation
- Keep an embedded itinerary map in Paris Pocket, including day filters that reflect edited dates, deletion and order.
- Google Maps is the default external location viewing and directions provider; replace legacy Apple Maps defaults with Google Maps URLs.
- Provide walking and driving navigation options. Use verified coordinates, addresses or Google Place IDs to prevent wrong destinations; retain provenance and distinguish venue centers, entrances, meeting spots and taxi pickups.
- Use app-compatible HTTPS Google Maps URLs so iPhone can open the installed app when supported, with a browser fallback. Actual handoff depends on the device and app availability and must be tested on iPhone.
- No paid Google Maps API integration unless necessary and approved. The embedded map can remain Leaflet; URL navigation does not authorize adding a paid Google SDK, keys or services.
- Provide clear network/failure states. Any route-time estimate must have a real source or be explicitly identified as an estimate; never invent durations.

### V1.3 — Hotel, restaurant and booking management
- Manage candidate/selected hotels and restaurants, addresses, user notes and related activities.
- Manage booking details, links and planned / reserved / confirmed / canceled statuses. Distinguish a tentative plan from an actual booking.
- Preserve existing checkbox states and personal notes through a tested migration; do not infer confirmation from itinerary time or a venue URL.
- Venue hours, seasonal availability and reservation requirements need official-source verification and a last-checked date.

### V2.0 — Multi-device and two-person synchronization
- Support shared planning for two travelers across multiple devices.
- Propose an architecture, conflict handling, privacy and cost before implementing authentication or cloud persistence. Local storage and backups remain the V1 baseline.

### Continuous engineering requirements
- Maintain offline reliability, accessible controls, stable IDs and understandable vanilla architecture.
- Keep automated tests for data validation, migrations/backups, activity operations and core navigation; test/document PWA updates and real iPhone acceptance.
- Continue using GitHub `jayven/Paris--traveler-note` and the existing Netlify site. Review through a branch/PR when available; no production deployment, production-branch push/merge or Netlify settings change without approval.

## 6. UX guidance
- Refined Paris travel journal, but functional over decorative: readable Chinese typography, strong hierarchy, good contrast, tap targets >=44px, predictable navigation.
- A tabbed experience for Daily Schedule, Map, Bookings and Trip Details is fine. Consider whether Hotel and Restaurants deserve a dedicated view after user needs are clearer.
- User should be able to see what to do now, what's booked, how to get there, and what needs a decision in just a few taps.
- Discuss visual design, aesthetics and animations separately. Do not introduce major visual redesigns unless requested. Preserve the current visual language for functional additions.
- Do not overload with animated splash screens, huge photo assets, or unnecessary account signup.

## 7. V1.1 acceptance criteria
1. App still works at common iPhone viewport sizes and desktop.
2. Existing itinerary data and map points remain correct.
3. Existing localStorage booking statuses and notes persist after upgrade.
4. A user can add/edit/delete/restore/reorder activities and move them between trip dates, with titles, times and descriptions persisting across reloads and offline use, and the full edited itinerary restorable from backup. Linked booking states and notes keep their stable association.
5. Original storage and earlier backups migrate without loss. Invalid imports, storage failures and stale-window writes cannot silently replace saved data.
6. A failed network fetch does not make itinerary content disappear; map failure produces a usable fallback.
7. PWA updates are tested/documented; iPhone "Add to Home Screen" still works.
8. Source changes can be reviewed through Git and deployed to existing Netlify origin without a new URL.
9. Provide a short test report and note any open questions; do not claim unverified tests passed.

## 8. Product collaboration and development process
- ChatGPT primarily helps define functionality and maintain travel itinerary requirements.
- Codex owns technical implementation and testing, including persistence, migrations, offline behavior and release verification.
- Visual design, aesthetics and animations are separate discussions; no major redesign without a request.
- First: read the existing source and this brief. Summarize architecture and prioritize 3–5 improvements.
- Then: implement a **small, testable first milestone**, verify locally, and explain changed files and any risks.
- Avoid broad unsupported redesigns. Propose the smallest useful implementation and make a concrete code change.
- Do not connect Netlify or publish into production without user authorization and required account access.
