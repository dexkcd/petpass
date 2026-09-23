import { describe, expect, it } from "vitest";
import { boundingBox, haversineKm } from "@/lib/geo/haversine";

const camden = { lat: 51.539, lng: -0.1426 };
const greenwich = { lat: 51.4826, lng: -0.0077 };

describe("haversineKm", () => {
  it("returns 0 for the same point", () => {
    expect(haversineKm(camden, camden)).toBe(0);
  });
  it("measures Camden to Greenwich at roughly 11 km", () => {
    const d = haversineKm(camden, greenwich);
    expect(d).toBeGreaterThan(10.5);
    expect(d).toBeLessThan(12);
  });
  it("is symmetric", () => {
    expect(haversineKm(camden, greenwich)).toBeCloseTo(haversineKm(greenwich, camden), 9);
  });
});

describe("boundingBox", () => {
  it("contains points within the radius", () => {
    const box = boundingBox(camden, 15);
    expect(greenwich.lat).toBeGreaterThan(box.minLat);
    expect(greenwich.lat).toBeLessThan(box.maxLat);
    expect(greenwich.lng).toBeGreaterThan(box.minLng);
    expect(greenwich.lng).toBeLessThan(box.maxLng);
  });
  it("excludes points well outside the radius", () => {
    const box = boundingBox(camden, 5);
    expect(greenwich.lng > box.maxLng || greenwich.lat < box.minLat).toBe(true);
  });
  it("widens longitude at higher latitudes", () => {
    const equator = boundingBox({ lat: 0, lng: 0 }, 10);
    const north = boundingBox({ lat: 60, lng: 0 }, 10);
    expect(north.maxLng - north.minLng).toBeGreaterThan(equator.maxLng - equator.minLng);
  });
});
