"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { MAPS_API_KEY, MapsProvider } from "@/components/maps/maps-provider";
import { PlacesInput } from "@/components/maps/places-input";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { MODE_LABELS, SPECIES_OPTIONS } from "@/lib/labels";
import type { ServiceMode } from "@/generated/prisma/enums";

export type CategoryChip = { slug: string; name: string; icon: string | null; kind: string };

export function SearchControls({ categories, hasLocation }: { categories: CategoryChip[]; hasLocation: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [geoError, setGeoError] = useState<string | null>(null);

  function update(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    start(() => router.push(`/search?${sp.toString()}`));
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError("Your browser does not support location.");
      return;
    }
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => update({ lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5), place: null }),
      () => setGeoError("We couldn't get your location. Search for a place instead."),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  const category = params.get("category") ?? "";

  return (
    <MapsProvider>
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            {MAPS_API_KEY ? (
              <PlacesInput
                placeholder="Search a town, postcode or address"
                onSelect={(p) => update({ lat: p.lat.toFixed(5), lng: p.lng.toFixed(5), place: p.formattedAddress })}
              />
            ) : (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  update({ lat: String(fd.get("lat") ?? ""), lng: String(fd.get("lng") ?? ""), place: null });
                }}
              >
                <Input name="lat" type="number" step="any" placeholder="Latitude" defaultValue={params.get("lat") ?? ""} aria-label="Latitude" />
                <Input name="lng" type="number" step="any" placeholder="Longitude" defaultValue={params.get("lng") ?? ""} aria-label="Longitude" />
                <Button type="submit" variant="secondary">
                  Go
                </Button>
              </form>
            )}
          </div>
          <Button type="button" variant="outline" onClick={useMyLocation} disabled={pending}>
            📍 Use my location
          </Button>
        </div>
        {geoError ? <p className="text-xs text-danger">{geoError}</p> : null}
        {!hasLocation ? <p className="text-xs text-muted">Showing central London until you share or search a location.</p> : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => update({ category: null })}
            className={`rounded-full px-3 py-1 text-sm ${!category ? "bg-primary text-primary-foreground" : "bg-slate-100 hover:bg-slate-200"}`}
          >
            All services
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => update({ category: c.slug })}
              className={`rounded-full px-3 py-1 text-sm ${category === c.slug ? "bg-primary text-primary-foreground" : "bg-slate-100 hover:bg-slate-200"}`}
            >
              {c.icon ? `${c.icon} ` : ""}
              {c.name}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          <Select aria-label="Species" value={params.get("species") ?? ""} onChange={(e) => update({ species: e.target.value || null })}>
            <option value="">Any species</option>
            {SPECIES_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <Select aria-label="Delivery mode" value={params.get("mode") ?? ""} onChange={(e) => update({ mode: e.target.value || null })}>
            <option value="">Any format</option>
            {(Object.entries(MODE_LABELS) as Array<[ServiceMode, string]>).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <Select aria-label="Radius" value={params.get("radiusKm") ?? "25"} onChange={(e) => update({ radiusKm: e.target.value })}>
            {[5, 10, 25, 50, 100].map((r) => (
              <option key={r} value={r}>
                Within {r} km
              </option>
            ))}
          </Select>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update({ q: String(new FormData(e.currentTarget).get("q") ?? "") });
            }}
          >
            <Input name="q" placeholder="Clinic name" defaultValue={params.get("q") ?? ""} aria-label="Clinic name" />
          </form>
        </div>
      </div>
    </MapsProvider>
  );
}
