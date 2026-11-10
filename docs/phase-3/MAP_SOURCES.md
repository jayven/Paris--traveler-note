# Phase 3 — Map location and road geometry source record

Review date: 2026-11-09. This is release preparation on the feature branch, not production deployment. It verifies public geographic references and precomputed road geometry, not personal reservations, travel-day access, tickets, guides, airport terminals or ferry operations.

## What was verified

`trip/location-verification.json` contains 48 Place records. 46 have a reviewed public venue, address, street or area reference. CDG's actual terminal and the precise Erasmusbrug boarding point remain unverified and have no coordinates or navigation target. The five hotel names and stay nights originate in the user's v4.12 PDF, page 8; the public hotel address/position check does not revalidate a private booking.

Each Place preserves its source record and adds a specific OSM object link and/or venue official page, the review date and a description of its positioning semantics. `verifiedStatus: verified` means the *stated reference* matches the named public place. It does not upgrade a building/park reference to a door, guide meeting point, luggage desk or taxi pickup. The app must display these semantics when offering navigation.

Important distinctions:

- Marquis: official website geo metadata near the public 8 Rue d'Anjou address, corroborated by the OSM house-number point.
- GHPR: official page map point near 4 Rue de Valois, corroborated by the OSM address. Early luggage deposit and late collection keep separate Stop IDs at the same coordinate.
- Grand Powers: `48.8692228, 2.3031298` from the official site's JSON-LD `geo`; no claimed taxi pickup point.
- Waldorf: matching named OSM hotel footprint and the official public address. The marker is the hotel property reference, not an asserted entrance/gate.
- Maison Astor: matching named OSM hotel point and official address at 11 Rue d'Astorg.
- Garnier: building marker uses the OSM **theatre**, excluding search results for a same-named restaurant/viewpoint. Its external navigation target uses the official visitor entrance **address at Rue Auber / Rue Scribe**, rather than pretending the building centre is the ticket entrance. The road geometry is a vicinity reference; it is not an indoor approach.
- Tuileries: preserves `48.8635, 2.3274` as a garden-centre reference near the reviewed named park. No Christmas market entrance is invented.
- Louvre: the pyramid remains a museum-area reference. DATA-02 guide time and meeting point remain unresolved, so the transfer to the guide is not published as a verified road segment.
- Trocadéro/Eiffel: public viewpoint/tower references, not a confirmed photography meeting point.
- Gare du Nord: matching OSM **railway station** rather than a metro, bus stop or historical information board. Rotterdam Centraal likewise uses the railway station, not a bus/metro result. Neither asserts a platform or check-in entrance.
- Kinderdijk: official visitor address **Nederwaard 1b** and its matching OSM address point, not a WaterShuttle pier. Cube Houses uses the exterior attraction, not the paid Kijk Kubus interior.
- Printemps: matched the 64 Boulevard Haussmann department-store object; excluded the same-named car-park result.
- Street/neighbourhood markers such as Champs-Élysées, George V, Rue des Martyrs and Le Marais are explicitly representative areas, not a promised shop/restaurant meeting point.

## Primary geographic and venue sources

All per-Place links and exact OSM object IDs are in `trip/location-verification.json`. Public addresses were corroborated where needed against:

| Place | Primary source | Scope |
| --- | --- | --- |
| Marquis | [Official hotel](https://www.marquisfaubourgsainthonore.com/) | Address and published geo metadata |
| GHPR | [Official hotel](https://www.grandhoteldupalaisroyal.com/en/) | Address and page map metadata |
| Waldorf | [Hilton location](https://www.hilton.com/en/hotels/cdgtpwa-waldorf-astoria-versailles-trianon-palace/hotel-location/) | Public address; not a pickup point |
| Grand Powers | [Official hotel](https://www.hotelgrandpowersparis.com/en/) | Address and JSON-LD location |
| Maison Astor | [Official contact](https://maisonastorparis.com/fr/page/contact-maison-astor-paris-curio-collection-by-hilton.23714.html) | Public address |
| Hermès Faubourg | [Official store](https://www.hermes.com/fr/fr/find-store/france/paris/hermes-paris-faubourg-saint-honore-DDB38Q6R/) | 24 Rue du Faubourg Saint-Honoré |
| Garnier | [Paris Opera visits FAQ](https://www.operadeparis.fr/en/useful-information/frequently-asked-questions/visits) | Visitor entrance address at Scribe/Auber |
| Printemps | [Official store](https://www.printemps.com/fr/fr/printemps-paris-haussmann) | 64 Boulevard Haussmann |
| Orangerie | [Official visitor information](https://www.musee-orangerie.fr/fr/visite/acces-horaires-tarifs) | Tuileries / Concorde, Seine side |
| Orsay | [Official visits](https://www.musee-orsay.fr/fr/visite) | Public museum location; no restaurant reservation claim |
| Louvre | [Official entrances](https://www.louvre.fr/en/visit/map-entrances-directions) | General museum access; not private-guide meeting |
| Rotterdam Centraal | [Railway operator station information](https://mijntickets.nsinternational.nl/NL/Stations/Rotterdam-Centraal) | Public station address; no train/platform verification |
| Kinderdijk | [Official contact](https://kinderdijk.nl/en/contact/) | Visitor address; no ferry schedule claim |
| Fenix | [Official visit information](https://www.fenix.nl/nl/plan-je-bezoek/) | Paul Nijghkade 5 |

No Google Place ID was inferred or invented. Google Maps HTTPS URLs remain the default external navigation option. The [official Google Maps URL documentation](https://developers.google.com/maps/documentation/urls/get-started) supports destination-only navigation and explicit origins without an API key. Actual iPhone Google Maps app/browser handoff still needs physical-device verification.

## Route provider, policy and data licence

Selected provider: **OSRM on FOSSGIS `routing.openstreetmap.de`**, using its separate `routed-foot` and `routed-car` backends. The mode comes from the reviewed itinerary source. Unknown modes are not silently converted to driving or walking. OSRM's [API documentation](https://project-osrm.org/docs/v5.24.0/api/) describes GeoJSON full route geometry and longitude/latitude coordinate order. The provider's [about/policy page](https://routing.openstreetmap.de/about.html) confirms its public walking/car profiles and lightweight API use.

The provider requires an identifying User-Agent, at most one request per second, attribution and a [fix-the-map link](https://www.openstreetmap.org/fixthemap); scraping and heavy usage are prohibited. The linked [German full policy](https://www.fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/) was blocked by Anubis during review, so this release follows the operator's accessible official English policy summary. It does not claim a service-level guarantee or unrestricted API use.

OpenStreetMap's [copyright/licence page](https://www.openstreetmap.org/copyright) permits copying/distribution/adaptation under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) with attribution and applicable share-alike requirements. The OSM-derived coordinate/geometry portions are distributed under ODbL 1.0, with source/license URLs in the JSON files. This does not assign personal notes or independent itinerary requirements to ODbL. The map UI must keep OSM attribution, the licence link and OSRM/FOSSGIS + fix-map credit. No third-party basemap imagery or Google geometry is stored.

**Nominatim policy restrictions:** the [official policy](https://operations.osmfoundation.org/policies/nominatim/) limits requests to at most one per second with an identifying User-Agent, attribution and cached responses. A small one-time task must use one thread on one machine. No autocomplete, generic public place-search feature, periodic geocoding or systematic map scraping is implemented. This phase used cached, serial, deliberately named public itinerary-place/address queries for this review, spaced at least 1.3 seconds apart; it did not submit personal booking information. The App, build and CI never call Nominatim. It is not a runtime dependency.

The route preparation made 29 serial requests, spaced at least 1.5 seconds apart after responses. The identifying User-Agent links to the existing repository. Outputs are committed data; opening a map does not make a routing API request. No paid service, API key, account or bulk map-tile download was introduced. Normal basemap display remains governed separately by the [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/); the App does not promise a complete offline basemap.

## Coverage and deliberate gaps

Review follow-up: [all 40 missing segments classified](ROUTE_GAP_AUDIT.md). Road geometry is **not** an objective for all 68 segments: 24/24 walking and 4/8 driving have stored paths; unknown/internal/rail/boat legs are classified by purpose. The audit changes no modes, locations or geometry.

`trip/route-overrides.json` holds **28 verified source-mode road segments / 68 total segments**, containing 3,199 actual provider-returned vertices. Geometry is GeoJSON `[longitude, latitude]`. There are **40 gaps** with explicit reasons. Some are same-venue transitions, unknown transport modes, rail or boat, and do not represent 40 missing road journeys. This coverage must not be represented as complete P0 “all daily real routes” acceptance.

| Day | Stored walking/driving segments | Explicit gaps |
| --- | ---: | ---: |
| Dec 7 — arrival | 6 | 2 |
| Dec 8 — Opera | 5 | 5 |
| Dec 9 — Orsay | 4 | 4 |
| Dec 10 — Versailles | 3 | 3 |
| Dec 11 — Louvre | 4 | 3 |
| Dec 12 — photos / Marais | 2 | 6 |
| Dec 13 — Rotterdam | 2 | 13 |
| Dec 14 — departure | 2 | 4 |

Specific exclusions:

- Arrival/departure CDG road paths await the actual terminal. No airport-centre proxy is used as a pickup/dropoff.
- Cruise product/boarding point and Rotterdam WaterShuttle operations/boarding points remain DATA-01/DATA-03 gaps. No rail or water segment receives a car route.
- Louvre private-guide transfers await DATA-02. The pyramid reference is not treated as a meeting point.
- The Luxembourg garden-centre → Orsay driving query snapped the first endpoint **270 m** to a road. It exceeded the 250 m car threshold and was rejected. The threshold was not relaxed to make it pass. A verified street-side pickup point is needed before publishing that segment.
- The Hameau → Waldorf return mode is unspecified; only the subsequent Waldorf → Grand Powers transfer is explicitly driving. No car route through the pedestrian estate is published.
- Unspecified hotel/urban transfers remain `unknown`; no transport choice is added to the itinerary to increase coverage.

For each saved geometry, the source URL records the provider, profile, generation timestamp, data licence, route version and endpoint snap distances. The server did not supply `data_version`; no underlying OSM extract date is fabricated. Geometry verification means a well-formed provider road result in the correct source mode, with endpoint proximity checked; it is not a survey, live traffic estimate, accessibility certification, guaranteed venue admission or travel-day closure check. Building and street references must remain labelled as such. No hand-drawn straight-line road fallback exists.

## Reproduction and checks

- `node scripts/generate-routes.cjs` is a network-free report. It does not change files.
- `node scripts/generate-routes.cjs --review` refreshes missing-route reasons without network; cached valid geometries remain.
- `node scripts/generate-routes.cjs --fetch` is an **explicit maintainer action** after reviewing current provider policies. It caches unchanged routes, requests at most 40 missing/revised eligible road segments, uses one process and rate limiting, and rejects bad geometry or large road snapping (150 m walking / 250 m driving). It is never invoked by the app, automatic build or CI.
- Run the official snapshot builder and pure-data tests after changes. A source itinerary version change requires rebuilding and revalidating the single official snapshot and manifest hash; these preparation JSON files are not separate runtime sync units.
- Validation checks unique IDs/references, finite coordinates, matching route version, valid geometry, mode restrictions and endpoint proximity. Runtime must draw only verified stored geometry, retain Stop identities/order when filtering, and show missing-route text plus permitted Google links when a segment is unavailable.

Further acceptance remains: confirm DATA-01…05, actual CDG terminal/meeting points and unspecified transport choices; complete remaining legitimate road routes once facts are known; physical iPhone map/navigation, offline and installed-PWA checks. None of these limitations is resolved merely by a valid GeoJSON response.
