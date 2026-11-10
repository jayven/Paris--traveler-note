/* Google Maps universal HTTPS URLs: no key, no geocoding or paid API. */
(function (root) {
  'use strict';
  function destination(place) {
    if (!place) throw new Error('地点不可用');
    if (place.lat !== undefined || place.lng !== undefined) {
      if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng) || Math.abs(place.lat) > 90 || Math.abs(place.lng) > 180) throw new Error('地点坐标不可用');
      return `${place.lat},${place.lng}`;
    }
    if (typeof place.address === 'string' && place.address.trim()) return place.address.trim();
    if (typeof place.googlePlaceId === 'string' && place.googlePlaceId.trim()) return place.name || place.googlePlaceId;
    throw new Error('地点坐标或核验地址不可用');
  }
  function view(place) {
    const url = new URL('https://www.google.com/maps/search/');
    url.searchParams.set('api', '1');
    url.searchParams.set('query', destination(place));
    if (place.googlePlaceId) url.searchParams.set('query_place_id', place.googlePlaceId);
    return url.href;
  }
  function directions(place, mode, origin) {
    if (!['walking', 'driving'].includes(mode)) throw new Error('导航方式不可用');
    const url = new URL('https://www.google.com/maps/dir/');
    url.searchParams.set('api', '1');
    url.searchParams.set('destination', destination(place));
    if (place.googlePlaceId) url.searchParams.set('destination_place_id', place.googlePlaceId);
    if (origin) {
      url.searchParams.set('origin', destination(origin));
      if (origin.googlePlaceId) url.searchParams.set('origin_place_id', origin.googlePlaceId);
    }
    url.searchParams.set('travelmode', mode);
    url.searchParams.set('dir_action', 'navigate');
    // Omit origin: Google uses the device location when available or requests a start point.
    return url.href;
  }
  const api = { view, directions };
  root.ParisMapLinks = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
