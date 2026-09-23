"use client";

import { useActionState, useMemo, useState } from "react";
import { MAPS_API_KEY, MapsProvider } from "@/components/maps/maps-provider";
import { PlacesInput, type PlaceSelection } from "@/components/maps/places-input";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess, Input, Select, Textarea } from "@/components/ui/form";
import type { ActionResult } from "@/lib/action-result";

export type ClinicFormValues = {
  name?: string;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  region?: string | null;
  postalCode?: string | null;
  country?: string;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
  timezone?: string;
};

function timeZones() {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["Europe/London", "Europe/Dublin", "Europe/Paris", "America/New_York", "America/Los_Angeles", "Australia/Sydney"];
  }
}

export function ClinicForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  initial?: ClinicFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const [addr, setAddr] = useState<ClinicFormValues>(initial ?? {});
  const zones = useMemo(() => timeZones(), []);
  const browserZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "Europe/London";
    }
  }, []);

  function applyPlace(p: PlaceSelection) {
    setAddr((prev) => ({
      ...prev,
      placeId: p.placeId,
      lat: p.lat,
      lng: p.lng,
      addressLine1: p.addressLine1 ?? prev.addressLine1,
      city: p.city ?? prev.city,
      region: p.region ?? prev.region,
      postalCode: p.postalCode ?? prev.postalCode,
      country: p.country ?? prev.country,
    }));
  }

  return (
    <MapsProvider>
      <form action={formAction} className="space-y-5">
        <FormError message={state && !state.ok ? state.error : undefined} />
        <FormSuccess message={state?.ok ? "Saved" : undefined} />

        <section className="space-y-4">
          <h2 className="font-semibold">About the business</h2>
          <Field label="Business name" htmlFor="name" errors={errors?.name}>
            <Input id="name" name="name" defaultValue={initial?.name ?? ""} required />
          </Field>
          <Field label="Description" htmlFor="description" hint="What you offer, specialities, languages spoken…" errors={errors?.description}>
            <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Contact email" htmlFor="email" errors={errors?.email}>
              <Input id="email" name="email" type="email" defaultValue={initial?.email ?? ""} />
            </Field>
            <Field label="Phone" htmlFor="phone" errors={errors?.phone}>
              <Input id="phone" name="phone" defaultValue={initial?.phone ?? ""} />
            </Field>
            <Field label="Website" htmlFor="website" errors={errors?.website}>
              <Input id="website" name="website" placeholder="https://" defaultValue={initial?.website ?? ""} />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold">Location</h2>
          {MAPS_API_KEY ? (
            <>
              <Field label="Find your address" htmlFor="places" hint="Pick from the suggestions to fill in the fields below and pin the map location.">
                <PlacesInput id="places" onSelect={applyPlace} />
              </Field>
              <input type="hidden" name="lat" value={addr.lat ?? ""} />
              <input type="hidden" name="lng" value={addr.lng ?? ""} />
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude" htmlFor="lat" hint="Google Maps is not configured, so enter the map pin manually." errors={errors?.lat}>
                <Input id="lat" name="lat" type="number" step="any" min={-90} max={90} defaultValue={initial?.lat ?? ""} required />
              </Field>
              <Field label="Longitude" htmlFor="lng" errors={errors?.lng}>
                <Input id="lng" name="lng" type="number" step="any" min={-180} max={180} defaultValue={initial?.lng ?? ""} required />
              </Field>
            </div>
          )}
          <input type="hidden" name="placeId" value={addr.placeId ?? ""} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Address line 1" htmlFor="addressLine1" errors={errors?.addressLine1} className="sm:col-span-2">
              <Input id="addressLine1" name="addressLine1" value={addr.addressLine1 ?? ""} onChange={(e) => setAddr({ ...addr, addressLine1: e.target.value })} required />
            </Field>
            <Field label="Address line 2" htmlFor="addressLine2" errors={errors?.addressLine2} className="sm:col-span-2">
              <Input id="addressLine2" name="addressLine2" value={addr.addressLine2 ?? ""} onChange={(e) => setAddr({ ...addr, addressLine2: e.target.value })} />
            </Field>
            <Field label="City / town" htmlFor="city" errors={errors?.city}>
              <Input id="city" name="city" value={addr.city ?? ""} onChange={(e) => setAddr({ ...addr, city: e.target.value })} required />
            </Field>
            <Field label="Region / county" htmlFor="region" errors={errors?.region}>
              <Input id="region" name="region" value={addr.region ?? ""} onChange={(e) => setAddr({ ...addr, region: e.target.value })} />
            </Field>
            <Field label="Postcode" htmlFor="postalCode" errors={errors?.postalCode}>
              <Input id="postalCode" name="postalCode" value={addr.postalCode ?? ""} onChange={(e) => setAddr({ ...addr, postalCode: e.target.value })} />
            </Field>
            <Field label="Country (2-letter code)" htmlFor="country" errors={errors?.country}>
              <Input id="country" name="country" maxLength={2} value={addr.country ?? "GB"} onChange={(e) => setAddr({ ...addr, country: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Time zone" htmlFor="timezone" hint="Opening hours and bookings are shown in this zone." errors={errors?.timezone}>
              <Select id="timezone" name="timezone" defaultValue={initial?.timezone ?? browserZone}>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {addr.lat && addr.lng ? (
            <p className="text-xs text-muted">
              Map pin: {addr.lat.toFixed(5)}, {addr.lng.toFixed(5)}
            </p>
          ) : (
            <p className="text-xs text-muted">No map pin yet. We will geocode the address when you save.</p>
          )}
        </section>

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </form>
    </MapsProvider>
  );
}
