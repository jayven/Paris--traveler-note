# Official itinerary v4.12.2 — December 8/9 update

Source: the user's **Paris Pocket — Itinerary Update & Direct Production Deployment** schedule supplied on 2026-11-12. Data schema remains 1; the next immutable release uses version `4.12.2` and release sequence `2`. This replaces the two dates' earlier v4.12 arrangements, not the other six days or the five confirmed hotel stays.

## Stable identities

Day IDs remain `day-opera` for December 8 and `day-orsay` for December 9. These existing identifiers are storage identities, not current theme names. Their dates and hotel associations are unchanged; displayed themes and notes now describe the new schedule.

| Existing activity ID | Updated date / treatment |
| --- | --- |
| `act-marquis-to-ghpr` | Dec 8, 08:00–09:15, first activity; replaces its previous midday timing. |
| `act-sainte-visit` | Moved to Dec 8, 09:30–10:30 target. |
| `act-notredame-visit` | Moved to Dec 8, 10:45–11:45 target; religious-observance visitor access remains pending. |
| `act-luxembourg-walk` | Moved to Dec 8, 12:00–12:40. |
| `act-orsay-lunch` | Moved to Dec 8, 13:15–14:15 target. |
| `act-orsay-visit` | Moved to Dec 8, 14:15–17:15 target. |
| `act-department-stores` | Dec 8, 17:45–19:15; may be shortened for fatigue. |
| `act-ghpr-checkout`, `act-palais-royal` | Dec 9, retain separate identities within the shared 08:45–09:30 window: luggage deposit first, gardens next. No invented internal timings. |
| `act-opera-visit` | Moved to Dec 9, 10:00–11:30 target. |
| `act-vivienne-optional` | Moved to Dec 9; optional within the 11:30–12:45 lunch window. |
| `act-montmartre` | Moved to Dec 9, 13:15–16:30. |
| `act-ghpr-luggage` | Dec 9, 16:30–17:30, distinct from morning luggage deposit. |
| `act-waldorf-arrival` | Dec 9 evening check-in/rest; actual arrival remains estimated. Its former combined departure/check-in meaning is split as below. |

New stable activity identities:

- `act-ghpr-return`: Dec 8 evening return to GHPR; `stop-ghpr-return` is a new visit, not the Dec 9 luggage-collection identity.
- `act-opera-lunch`: Dec 9, 11:30–12:45. No restaurant or map point is invented (`placeIds: []`).
- `act-waldorf-transfer`: Dec 9, approximately 17:30–18:00 **departure** from Paris. New `stop-waldorf-transfer` refers to the Waldorf destination and explicitly labels this as a departure window, not a promised arrival. Existing `stop-waldorf-arrival` remains the separate evening check-in at the same hotel.

`act-martyrs-optional` and `act-orsay-transfer` are explicitly added to `retiredActivityIds`: the new schedule contains neither the Rue des Martyrs alternative nor a separate timed Orsay transfer activity. Existing notes/backup records are retained by the current retirement mechanism. They are not reassigned to a different activity. The Luxembourg-to-Orsay connection remains in the day's map.

## Stops and tasks

Existing moved Stop IDs keep their original activity/place bindings. Montmartre follows Abbesses (existing neighborhood reference) → Sacré-Cœur → Place du Tertre, so the stable Stop IDs appear in order `stop-montmartre-1`, `stop-montmartre-3`, `stop-montmartre-2`; their numeric suffixes are not reassigned. Abbesses is not a newly asserted meeting point.

Dec 8: Marquis → GHPR → Sainte-Chapelle → Notre-Dame → Luxembourg Gardens → Orsay lunch → Orsay visit → Galeries Lafayette → Printemps → GHPR.

Dec 9: GHPR luggage deposit → Palais Royal → Palais Garnier → optional Galerie Vivienne → Montmartre references → GHPR luggage collection → Waldorf destination → evening hotel check-in. Lunch has no unspecified restaurant marker. Optional Vivienne remains visibly optional.

The existing five task IDs `task-sainte`, `task-notredame`, `task-orsay`, `task-orsay-lunch`, and `task-opera` retain their identities and follow their activities' dates. The Notre-Dame task is updated in place with the December 8 religious-observance/access warning, without creating a duplicate task. Personal completion flags are not reset. Unconfirmed entries remain unconfirmed; hotel confirmation does not confirm attraction bookings or hotel arrival times.

## Route integrity

No geometry is transferred merely because a Segment keeps a familiar name. Route overrides may reuse verified paths only when the verified Place endpoints, coordinates and transport mode are unchanged. Reordered/new connections otherwise remain without geometry; there are no fabricated straight-line roads or ETAs. Same-venue Orsay and Waldorf transitions have no road line. Unspecified transport modes remain `unknown`.

All segments carry `routeDataVersion: "4.12.2"` to satisfy the existing schema. This packaging-version change does not alter the unchanged days' geometries or provenance. The v4.12.1 hashed release is retained unchanged for supported-client rollback and update compatibility. Personal database schema, application code, visual design, App Icon and PWA identity are unchanged.

Current route coverage: 68 segments total, 25 with verified geometry. Dec 8 has 9 segments / 4 verified paths; Dec 9 has 9 segments / 2 verified paths. Six paths reuse identical verified endpoint/mode/coordinate/provenance pairs. The two days retain 12 explicit gaps: nine unresolved transport choices, the existing Luxembourg-to-Orsay driving route rejected for a 270 m road snap, and two same-venue transitions. No new routing request was needed because there was no newly eligible known-mode pair. Twelve orphan override IDs were removed; the other 50 segments retain their geometry and provenance unchanged.
