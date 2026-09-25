"use client";

import { useState } from "react";
import { ClinicMap, type MapClinic } from "@/components/maps/clinic-map";
import { MAPS_API_KEY } from "@/components/maps/maps-provider";

/**
 * Clinic location card. The interactive Google Map is only loaded when the
 * visitor asks for it, so the clinic page stays light and scrollable on phones.
 */
export function LazyClinicMap({ clinic, address }: { clinic: MapClinic; address: string }) {
  const [show, setShow] = useState(false);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${clinic.lat},${clinic.lng}`)}`;
  const search = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${clinic.name}, ${address}`)}`;

  if (show) {
    return (
      <div className="space-y-2">
        <ClinicMap clinics={[clinic]} center={{ lat: clinic.lat, lng: clinic.lng }} showCenterMarker={false} className="h-64" />
        <div className="flex gap-3 text-sm">
          <a href={directions} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            Get directions
          </a>
          <button type="button" onClick={() => setShow(false)} className="text-muted hover:underline">
            Hide map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium">📍 {address}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={directions} target="_blank" rel="noreferrer" className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
          Get directions
        </a>
        <a href={search} target="_blank" rel="noreferrer" className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium">
          Open in Google Maps
        </a>
        {MAPS_API_KEY ? (
          <button type="button" onClick={() => setShow(true)} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium">
            Show map
          </button>
        ) : null}
      </div>
    </div>
  );
}
