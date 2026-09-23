"use client";

import { AdvancedMarker, InfoWindow, Map, Pin, useMap } from "@vis.gl/react-google-maps";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MAPS_API_KEY, MapsProvider } from "@/components/maps/maps-provider";
import { formatDistance } from "@/lib/geo/haversine";

export type MapClinic = { id: string; slug: string; name: string; lat: number; lng: number; distanceKm?: number; addressLine1?: string };

function FitBounds({ points }: { points: Array<{ lat: number; lng: number }> }) {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    for (const p of points) bounds.extend(p);
    map.fitBounds(bounds, 48);
  }, [map, points]);
  return null;
}

export function ClinicMap({
  clinics,
  center,
  className,
  selectedId,
  onSelect,
}: {
  clinics: MapClinic[];
  center: { lat: number; lng: number };
  className?: string;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}) {
  const [open, setOpen] = useState<string | null>(selectedId ?? null);
  const active = clinics.find((c) => c.id === (selectedId ?? open));

  if (!MAPS_API_KEY) {
    return (
      <div className={`grid place-items-center rounded-xl border border-dashed border-border bg-slate-50 p-6 text-center text-sm text-muted ${className ?? ""}`}>
        <p>
          Map preview needs a Google Maps browser key.
          <br />
          Set <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable it.
        </p>
      </div>
    );
  }

  const points = [center, ...clinics.map((c) => ({ lat: c.lat, lng: c.lng }))];
  return (
    <MapsProvider>
      <div className={`overflow-hidden rounded-xl border border-border ${className ?? ""}`}>
        <Map defaultCenter={center} defaultZoom={12} mapId="PETPASS_MAP" gestureHandling="greedy" disableDefaultUI={false} className="h-full w-full">
          <FitBounds points={points} />
          <AdvancedMarker position={center} title="Your location">
            <Pin background="#0f766e" borderColor="#0f766e" glyphColor="#ffffff" scale={0.8} />
          </AdvancedMarker>
          {clinics.map((c) => (
            <AdvancedMarker
              key={c.id}
              position={{ lat: c.lat, lng: c.lng }}
              title={c.name}
              onClick={() => {
                setOpen(c.id);
                onSelect?.(c.id);
              }}
            >
              <Pin background={c.id === active?.id ? "#f59e0b" : "#ef4444"} borderColor="#7f1d1d" glyphColor="#ffffff" />
            </AdvancedMarker>
          ))}
          {active ? (
            <InfoWindow
              position={{ lat: active.lat, lng: active.lng }}
              pixelOffset={[0, -40]}
              onClose={() => {
                setOpen(null);
                onSelect?.(null);
              }}
            >
              <div className="min-w-40 text-sm">
                <p className="font-semibold">{active.name}</p>
                {active.addressLine1 ? <p className="text-slate-600">{active.addressLine1}</p> : null}
                {active.distanceKm !== undefined ? <p className="text-slate-600">{formatDistance(active.distanceKm)} away</p> : null}
                <Link href={`/clinics/${active.slug}`} className="text-teal-700 underline">
                  View clinic
                </Link>
              </div>
            </InfoWindow>
          ) : null}
        </Map>
      </div>
    </MapsProvider>
  );
}
