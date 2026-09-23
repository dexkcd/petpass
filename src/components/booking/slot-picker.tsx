"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/form";
import { formatTime } from "@/lib/utils";

type SlotsResponse = { timezone: string; durationMin: number; slots: string[] } | { error: string };

export function SlotPicker({
  serviceId,
  minDate,
  maxDate,
  clinicTimezone,
  value,
  onChange,
}: {
  serviceId: string;
  minDate: string;
  maxDate: string;
  clinicTimezone: string;
  value: string | null;
  onChange: (iso: string | null) => void;
}) {
  const [date, setDate] = useState(minDate);
  const [result, setResult] = useState<{ key: string; slots: string[]; error: string | null } | null>(null);
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const showBrowserZone = browserZone !== clinicTimezone;
  const key = `${serviceId}|${date}`;
  const loading = result?.key !== key;
  const slots = loading ? null : result.slots;
  const error = loading ? null : result.error;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/slots?serviceId=${encodeURIComponent(serviceId)}&date=${date}`)
      .then((r) => r.json() as Promise<SlotsResponse>)
      .then((data) => {
        if (cancelled) return;
        if ("error" in data) setResult({ key, slots: [], error: data.error });
        else setResult({ key, slots: data.slots, error: null });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, slots: [], error: "Could not load availability" });
      });
    return () => {
      cancelled = true;
    };
  }, [serviceId, date, key]);

  return (
    <div className="space-y-3">
      <div className="max-w-xs">
        <label htmlFor="date" className="mb-1 block text-sm font-medium">
          Date
        </label>
        <Input
          id="date"
          type="date"
          min={minDate}
          max={maxDate}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            onChange(null);
          }}
        />
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {loading ? <p className="text-sm text-muted">Checking availability…</p> : null}
      {!loading && slots && slots.length === 0 && !error ? <p className="text-sm text-muted">No free times on this day. Try another date.</p> : null}
      {slots && slots.length > 0 ? (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Available times">
          {slots.map((iso) => {
            const selected = value === iso;
            return (
              <button
                key={iso}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(iso)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary"}`}
              >
                {formatTime(iso, clinicTimezone)}
                {showBrowserZone ? <span className="block text-[10px] opacity-80">{formatTime(iso, browserZone)} your time</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
      <p className="text-xs text-muted">Times shown in {clinicTimezone}.</p>
    </div>
  );
}
