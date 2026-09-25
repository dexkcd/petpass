"use client";

import { AdvancedMarker, InfoWindow, Map, Pin, useMap } from "@vis.gl/react-google-maps";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MapErrorBoundary } from "@/components/maps/map-error-boundary";
import { MAPS_API_KEY, MAPS_MAP_ID, MapsProvider } from "@/components/maps/maps-provider";
import { formatDistance } from "@/lib/geo/haversine";

export type MapClinic = { id: string; slug: string; name: string; lat: number; lng: number; distanceKm?: number; addressLine1?: string };

type LatLng = { lat: number; lng: number };

/**
 * Fits the camera to the points once per distinct set of points. The effect is
 * keyed on the coordinates themselves, not on array identity, so re-renders
 * (e.g. selecting a marker) do not re-fit the map.
 */
function FitBounds({ pointsKey }: { pointsKey: string }) {
  const map = useMap();
  useEffect(() => {
    const points = JSON.parse(pointsKey) as LatLng[];
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    for (const p of points) bounds.extend(p);
    map.fitBounds(bounds, 48);
  }, [map, pointsKey]);
  return null;
}

export function ClinicMap({
  clinics,
  center,
  className,
  selectedId,
  onSelect,
  showCenterMarker = true,
  zoomOnSingle = 15,
}: {
  clinics: MapClinic[];
  center: LatLng;
  className?: string;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Draw a "your location" pin at `center` (search page only). */
  showCenterMarker?: boolean;
  zoomOnSingle?: number;
}) {
  const [open, setOpen] = useState<string | null>(selectedId ?? null);
  const active = clinics.find((c) => c.id === (selectedId ?? open));
  const pointsKey = useMemo(
    () => JSON.stringify([...(showCenterMarker ? [center] : []), ...clinics.map((c) => ({ lat: c.lat, lng: c.lng }))]),
    [center, clinics, showCenterMarker],
  );

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

  const fallback = (
    <div className={`grid place-items-center rounded-xl border border-dashed border-border bg-slate-50 p-6 text-center text-sm text-muted ${className ?? ""}`}>
      The map could not be displayed on this device.
    </div>
  );

  return (
    <MapErrorBoundary fallback={fallback}>
    <MapsProvider>
      <div className={`overflow-hidden rounded-xl border border-border ${className ?? ""}`}>
        <Map
          defaultCenter={center}
          defaultZoom={clinics.length === 1 ? zoomOnSingle : 12}
          mapId={MAPS_MAP_ID}
          gestureHandling="cooperative"
          clickableIcons={false}
          className="h-full w-full"
        >
          <FitBounds pointsKey={pointsKey} />
          {showCenterMarker ? (
            <AdvancedMarker position={center} title="Your location">
              <Pin background="#0f766e" borderColor="#0f766e" glyphColor="#ffffff" scale={0.8} />
            </AdvancedMarker>
          ) : null}
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
    </MapErrorBoundary>
  );
}
