import { describe, expect, it } from "vitest";
import { boundingBox, haversineKm } from "@/lib/geo/haversine";

const makati = { lat: 14.5547, lng: 121.0244 };
const quezonCity = { lat: 14.6329, lng: 121.0355 };

describe("haversineKm", () => {
  it("returns 0 for the same point", () => {
    expect(haversineKm(makati, makati)).toBe(0);
  });
  it("measures Makati to Quezon City at roughly 9 km", () => {
    const d = haversineKm(makati, quezonCity);
    expect(d).toBeGreaterThan(8);
    expect(d).toBeLessThan(10);
  });
  it("is symmetric", () => {
    expect(haversineKm(makati, quezonCity)).toBeCloseTo(haversineKm(quezonCity, makati), 9);
  });
});

describe("boundingBox", () => {
  it("contains points within the radius", () => {
    const box = boundingBox(makati, 15);
    expect(quezonCity.lat).toBeGreaterThan(box.minLat);
    expect(quezonCity.lat).toBeLessThan(box.maxLat);
    expect(quezonCity.lng).toBeGreaterThan(box.minLng);
    expect(quezonCity.lng).toBeLessThan(box.maxLng);
  });
  it("excludes points well outside the radius", () => {
    const box = boundingBox(makati, 5);
    expect(quezonCity.lat > box.maxLat || quezonCity.lng > box.maxLng).toBe(true);
  });
  it("widens longitude at higher latitudes", () => {
    const equator = boundingBox({ lat: 0, lng: 0 }, 10);
    const north = boundingBox({ lat: 60, lng: 0 }, 10);
    expect(north.maxLng - north.minLng).toBeGreaterThan(equator.maxLng - equator.minLng);
  });
});
