/* Google Maps universal HTTPS URLs: no key, no geocoding or paid API. */
(function (root) {
  'use strict';
  function destination(place) {
    if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng) || Math.abs(place.lat) > 90 || Math.abs(place.lng) > 180) {
      throw new Error('地点坐标不可用');
    }
    return `${place.lat},${place.lng}`;
  }
  function view(place) {
    const url = new URL('https://www.google.com/maps/search/');
    url.searchParams.set('api', '1');
    url.searchParams.set('query', destination(place));
    if (place.googlePlaceId) url.searchParams.set('query_place_id', place.googlePlaceId);
    return url.href;
  }
  function directions(place, mode) {
    if (!['walking', 'driving'].includes(mode)) throw new Error('导航方式不可用');
    const url = new URL('https://www.google.com/maps/dir/');
    url.searchParams.set('api', '1');
    url.searchParams.set('destination', destination(place));
    if (place.googlePlaceId) url.searchParams.set('destination_place_id', place.googlePlaceId);
    url.searchParams.set('travelmode', mode);
    url.searchParams.set('dir_action', 'navigate');
    // Omit origin: Google uses the device location when available or requests a start point.
    return url.href;
  }
  const api = { view, directions };
  root.ParisMapLinks = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
