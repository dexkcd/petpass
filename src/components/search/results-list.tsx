"use client";

import Link from "next/link";
import { useState } from "react";
import { ClinicMap } from "@/components/maps/clinic-map";
import { Badge } from "@/components/ui/card";
import { formatDistance } from "@/lib/geo/haversine";
import type { NearbyClinic } from "@/lib/clinics/search";

const KIND_TONE: Record<string, "primary" | "info" | "warning"> = { VET: "primary", SPECIALIST: "info", GROOMING: "warning" };
const KIND_LABEL: Record<string, string> = { VET: "Vet", SPECIALIST: "Specialist", GROOMING: "Grooming" };

export function SearchResults({ clinics, center }: { clinics: NearbyClinic[]; center: { lat: number; lng: number } }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <ClinicMap clinics={clinics} center={center} selectedId={selected} onSelect={setSelected} className="h-80 lg:h-[32rem]" />
      </div>
      <ol className="space-y-2 lg:col-span-2 lg:max-h-[32rem] lg:overflow-auto">
        {clinics.map((c) => (
          <li key={c.id}>
            <Link
              href={`/clinics/${c.slug}`}
              onMouseEnter={() => setSelected(c.id)}
              className={`block rounded-xl border bg-card p-4 shadow-sm transition hover:border-primary ${selected === c.id ? "border-primary" : "border-border"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-sm text-muted">
                    {c.addressLine1}, {c.city}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-primary">{formatDistance(c.distanceKm)}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {c.kinds.map((k) => (
                  <Badge key={k} tone={KIND_TONE[k] ?? "neutral"}>
                    {KIND_LABEL[k] ?? k}
                  </Badge>
                ))}
                <span className="text-xs text-muted">{c.serviceCount} bookable services</span>
              </div>
              {c.description ? <p className="mt-2 line-clamp-2 text-sm text-muted">{c.description}</p> : null}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
