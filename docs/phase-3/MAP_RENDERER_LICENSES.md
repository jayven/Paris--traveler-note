# Map renderer upgrade — sources, licences and compatibility

Review date: 2026-11-09. Scope: MapLibre GL JS / OpenFreeMap display only. Existing official Places, Stops, Segments, verified OSRM geometries and Google Maps URLs remain unchanged. No route or geocoding service is called by this upgrade.

## Pinned renderer and browser loading

The official [latest stable release](https://github.com/maplibre/maplibre-gl-js/releases/tag/v6.17.0), checked for this implementation, is **MapLibre GL JS 6.17.0**, released November 7, 2026. Its tagged [package manifest](https://github.com/maplibre/maplibre-gl-js/blob/v6.17.0/package.json) declares BSD-3-Clause. Version 6 is ESM-only: the old UMD `maplibre-gl.js` entry no longer exists. Paris Pocket must use the exact version, without `latest` or a semver range. The [tagged migration guide](https://github.com/maplibre/maplibre-gl-js/blob/v6.17.0/docs/guides/v5-to-v6-migration-guide.md) documents this change.

| Resource | Exact versioned URL |
| --- | --- |
| Lazy browser ES module | `https://unpkg.com/maplibre-gl@6.17.0/dist/maplibre-gl.mjs` |
| Lazy CSS | `https://unpkg.com/maplibre-gl@6.17.0/dist/maplibre-gl.css` |
| Matching worker | `https://unpkg.com/maplibre-gl@6.17.0/dist/maplibre-gl-worker.mjs` |

Direct browser ESM is an officially supported **no-bundler** setup. The worker is detected from the imported module URL; for a cross-origin CDN it is loaded through a same-origin Blob wrapper. A separate bundler-style `setWorkerUrl()` override is not required. The exact module pin therefore determines the matching worker version as well. See the [tagged CDN instructions](https://github.com/maplibre/maplibre-gl-js/blob/v6.17.0/docs/index.md#cdn--no-bundler). Avoid a new framework/build system just to load this library.

The CDN module, stylesheet and worker were fetched once for packaging verification; each returned CORS `*`. Verified uncompressed sizes were 1,110,272 / 71,596 / 520,114 bytes respectively. They are external lazy dependencies, not part of the offline core or a promise of a complete offline map. Native dynamic `import()` does not provide a conventional script-tag `integrity` attribute; an exact URL pin is **not** a claim of cryptographic integrity for the whole module/worker graph. CSS can use this verified digest with `crossorigin="anonymous"`:

```text
sha384-S+OnE5M4U3Qc2nR0RgljGrVs06xqfRg8L7uFk/pOF5+sRuSDG4oKkqKZmFrx7w09
```

Cross-origin workers need the Blob mechanism allowed by any applicable CSP. The implementation must not silently weaken or add a production CSP to make it work. A restrictive deployment policy instead requires a separately reviewed same-origin worker arrangement or the existing list/navigation fallback.

## Provider, styles and usage policy

OpenFreeMap's [official quick start](https://openfreemap.org/quick_start/) supports MapLibre and offers both requested styles:

- Default: `https://tiles.openfreemap.org/styles/positron`.
- Isolated visual comparison only: `https://tiles.openfreemap.org/styles/liberty`.

The provider's [official repository](https://github.com/hyperknot/openfreemap) states that the public service needs no account or API key and is free. It provides a basemap, not route calculation/geocoding/navigation. This task neither creates an account nor signs up for a paid plan. The existing stored OSRM data is not generated or verified by OpenFreeMap.

The [Terms of Service](https://openfreemap.org/tos/), updated October 14, 2026, provide the service without an availability warranty and restrict disruptive/automated collection. Their bounded offline-download exception is not used here: **no area downloader, bulk tile fetch, SW pre-cache or persistent offline basemap cache is introduced**. Browser requests needed to draw the currently visible map are distinct from an offline-download feature. The [privacy policy](https://openfreemap.org/privacy/), updated October 8, describes limited service logging; the app must not claim that requests to an external basemap expose no network metadata.

Only two live style manifests and their public TileJSON metadata were inspected for this review; no map-tile regions were downloaded. A default Python User-Agent received an initial 403; retry with an identifying Paris Pocket User-Agent returned the public configurations. This was not an authentication or security-warning bypass, and browser-style loading still requires its own real network test.

The inspected Positron layers comprise background, fills, lines and symbols, with no terrain or extrusion. Liberty includes a `fill-extrusion` layer and a low-zoom Natural Earth raster background. The Liberty comparison must hide 3D extrusion and keep flat pitch/bearing; it must not introduce 3D/terrain effects into the product. Positron remains the shipped default. Provider styles/data can change independently of the pinned renderer; the immutable itinerary snapshot does not make a basemap immutable.

## Required credits and licence separation

| Component | Primary licence / source | Implementation requirement |
| --- | --- | --- |
| MapLibre GL JS 6.17.0 | [Tagged BSD-3-Clause and included notices](https://github.com/maplibre/maplibre-gl-js/blob/v6.17.0/LICENSE.txt) | Preserve upstream notices in any redistributed copy; CDN assets are not rewritten or vendored by this change. Do not use contributors' names as product endorsement. A future self-hosted copy must ship its complete upstream notice file. |
| OpenFreeMap service / infrastructure | [Official licence inventory](https://github.com/hyperknot/openfreemap/blob/main/LICENSE.md), project MIT | Public service terms remain separate from underlying map-data/design licences. Keep a provider link; do not label its basemap as an OSRM routing service. |
| OpenMapTiles schema/design | [Official licence](https://github.com/openmaptiles/openmaptiles/blob/master/LICENSE.md): code BSD-3-Clause; design CC BY 4.0 | Keep linked **© OpenMapTiles** attribution in the map corner. |
| Positron design | [Style licence](https://github.com/openmaptiles/positron-gl-style/blob/master/LICENSE.md): BSD code / CC BY 4.0 design, with credited CARTO/Stamen/Paul Norman ancestry | Do not remove design credits; keep the OpenMapTiles/OSM credits and an accessible licence/source reference. |
| Liberty design | [OpenFreeMap's style licence inventory](https://github.com/hyperknot/openfreemap/blob/main/LICENSE.md#styles): OSM Liberty / OSM Bright lineage | Same visible basemap credits; comparison screenshots must retain them. No claim that Paris Pocket authored the provider style. |
| Geographic data | [OpenStreetMap copyright/ODbL](https://www.openstreetmap.org/copyright) | Keep linked OSM credit and licence access. This licence is not applied to private notes or independent travel-plan text. |
| Stored route geometry | [FOSSGIS/OSRM provider](https://routing.openstreetmap.de/about.html), OSM-derived data under ODbL; existing [route source review](MAP_SOURCES.md) | Keep its separate OSRM/FOSSGIS + OSM/ODbL credit and [fix-map link](https://www.openstreetmap.org/fixthemap). No new routing requests or permission reinterpretation. |

The inspected `https://tiles.openfreemap.org/planet` TileJSON supplies linked **OpenFreeMap · © OpenMapTiles · Data from OpenStreetMap** attribution. The provider's [attribution guidance](https://github.com/hyperknot/openfreemap#attribution) says MapLibre adds these automatically; attribution controls and links must remain present and usable. OpenFreeMap itself is optional in that guidance, but Paris Pocket keeps it to identify the provider clearly. OpenMapTiles' licence explicitly calls for the map-corner credit in an interactive map; a route-only credit below the map does not replace it.

Keep the existing route-source text separate so neither screenshot nor UI implies OpenFreeMap computed the 28 road paths. Failure fallback may remove the unavailable canvas, but must keep valid activity/navigation lists and their positioning caveats.

## Safari, iPhone and PWA acceptance boundary

MapLibre 6 removes WebGL1 and requires **WebGL2**; when unavailable its constructor can throw `GPUInitializationError`. Re-creating a lost context can also fail via the map's `error` event. Both paths need controlled fallback; see the [official support example](https://maplibre.org/maplibre-gl-js/docs/examples/check-if-webgl-is-supported/). A nominal browser name/version is not a substitute for successful initialization on a device.

WebKit's [Safari 15 announcement](https://webkit.org/blog/11989/new-webkit-features-in-safari-15/) establishes WebGL2 feature availability from that release. It does **not** certify every iPhone/iOS 15 combination, memory condition, module-worker/CSP policy or standalone PWA. The selected 6.17.0 release includes an iOS 15 shader fix, but this remains release-note evidence rather than physical-device acceptance.

Automated Chromium/mobile viewport or desktop WebKit results must be identified as such. Before any production release, use an approved HTTPS preview on a real iPhone in Safari **and** a home-screen PWA: load the map, switch all eight days rapidly, verify repeat visits/route toggle/filter/detail focus, deny or lose WebGL/network access through a controlled test path, and verify readable stop/Google navigation fallback. Offline itinerary, notes, tasks, imports and sync remain governed by their existing independent tests. Never clear production storage to test this renderer.

This review does not authorize removing `[skip netlify]`, changing deployment settings or creating a fresh preview. Those remain user-approval gates.
