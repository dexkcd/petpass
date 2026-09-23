import "server-only";

export type GeocodeResult = { lat: number; lng: number; placeId?: string; formattedAddress?: string };

/**
 * Server-side Google Geocoding. Returns null when no server key is configured
 * or the address could not be resolved; callers fall back to coordinates
 * supplied by Places Autocomplete in the browser.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key || !address.trim()) return null;
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", address);
    url.searchParams.set("key", key);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status: string;
      results?: Array<{ place_id: string; formatted_address: string; geometry: { location: { lat: number; lng: number } } }>;
    };
    const first = data.results?.[0];
    if (data.status !== "OK" || !first) return null;
    return {
      lat: first.geometry.location.lat,
      lng: first.geometry.location.lng,
      placeId: first.place_id,
      formattedAddress: first.formatted_address,
    };
  } catch (error) {
    console.error("geocode failed", error);
    return null;
  }
}

export function formatAddress(a: {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  region?: string | null;
  postalCode?: string | null;
  country: string;
}) {
  return [a.addressLine1, a.addressLine2, a.city, a.region, a.postalCode, a.country].filter(Boolean).join(", ");
}
