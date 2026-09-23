export const EARTH_RADIUS_KM = 6371;

export type LatLng = { lat: number; lng: number };

export function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng) {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Bounding box (in degrees) around a point, used to pre-filter rows with a
 * plain index before computing the exact distance.
 */
export function boundingBox(center: LatLng, radiusKm: number) {
  const latDelta = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
  const cos = Math.max(Math.cos(toRadians(center.lat)), 1e-6);
  const lngDelta = ((radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI)) / cos;
  return {
    minLat: Math.max(-90, center.lat - latDelta),
    maxLat: Math.min(90, center.lat + latDelta),
    minLng: Math.max(-180, center.lng - lngDelta),
    maxLng: Math.min(180, center.lng + lngDelta),
  };
}

export function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
