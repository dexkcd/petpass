"use client";

import { useActionState, useState } from "react";
import { createBookingAction } from "@/actions/bookings";
import { SlotPicker } from "@/components/booking/slot-picker";
import { Button } from "@/components/ui/button";
import { Field, FormError, Select, Textarea } from "@/components/ui/form";
import { SPECIES_LABELS } from "@/lib/labels";
import type { Species } from "@/generated/prisma/enums";

export type BookablePet = { id: string; name: string; species: Species; compatible: boolean };

export function BookingForm({
  serviceId,
  pets,
  minDate,
  maxDate,
  clinicTimezone,
}: {
  serviceId: string;
  pets: BookablePet[];
  minDate: string;
  maxDate: string;
  clinicTimezone: string;
}) {
  const [state, formAction, pending] = useActionState(createBookingAction, undefined);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const firstCompatible = pets.find((p) => p.compatible);
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="startsAt" value={startsAt ?? ""} />
      <FormError message={state && !state.ok ? state.error : undefined} />
      <Field label="Which pet?" htmlFor="petId" errors={errors?.petId}>
        <Select id="petId" name="petId" defaultValue={firstCompatible?.id ?? ""} required>
          <option value="">Choose a pet</option>
          {pets.map((p) => (
            <option key={p.id} value={p.id} disabled={!p.compatible}>
              {p.name} ({SPECIES_LABELS[p.species]}){p.compatible ? "" : " — not offered for this species"}
            </option>
          ))}
        </Select>
      </Field>
      <div>
        <SlotPicker serviceId={serviceId} minDate={minDate} maxDate={maxDate} clinicTimezone={clinicTimezone} value={startsAt} onChange={setStartsAt} />
        {errors?.startsAt ? <p className="mt-1 text-xs text-danger">{errors.startsAt[0]}</p> : null}
      </div>
      <Field label="Anything the clinic should know?" htmlFor="ownerNotes" errors={errors?.ownerNotes}>
        <Textarea id="ownerNotes" name="ownerNotes" placeholder="Symptoms, questions, behaviour notes…" />
      </Field>
      <Button type="submit" disabled={pending || !startsAt}>
        {pending ? "Booking…" : "Request booking"}
      </Button>
    </form>
  );
}
