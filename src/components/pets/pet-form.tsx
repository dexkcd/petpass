"use client";

import { useActionState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import type { ActionResult } from "@/lib/action-result";
import { SEX_LABELS, SPECIES_OPTIONS, toDateInput } from "@/lib/labels";
import type { Sex, Species } from "@/generated/prisma/enums";

export type PetFormValues = {
  name?: string;
  species?: Species;
  breed?: string | null;
  sex?: Sex;
  birthDate?: Date | null;
  weightKg?: number | string | null;
  color?: string | null;
  microchipId?: string | null;
  notes?: string | null;
};

export function PetForm({
  action,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  initial?: PetFormValues;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state && !state.ok ? state.error : undefined} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" errors={errors?.name}>
          <Input id="name" name="name" defaultValue={initial?.name ?? ""} required />
        </Field>
        <Field label="Species" htmlFor="species" errors={errors?.species}>
          <Select id="species" name="species" defaultValue={initial?.species ?? "DOG"}>
            {SPECIES_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Breed" htmlFor="breed" errors={errors?.breed}>
          <Input id="breed" name="breed" defaultValue={initial?.breed ?? ""} placeholder="e.g. Labrador, Bearded dragon" />
        </Field>
        <Field label="Sex" htmlFor="sex" errors={errors?.sex}>
          <Select id="sex" name="sex" defaultValue={initial?.sex ?? "UNKNOWN"}>
            {(Object.entries(SEX_LABELS) as Array<[Sex, string]>).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date of birth" htmlFor="birthDate" errors={errors?.birthDate}>
          <Input id="birthDate" name="birthDate" type="date" defaultValue={toDateInput(initial?.birthDate)} />
        </Field>
        <Field label="Weight (kg)" htmlFor="weightKg" errors={errors?.weightKg}>
          <Input id="weightKg" name="weightKg" type="number" step="0.01" min="0" defaultValue={initial?.weightKg ?? ""} />
        </Field>
        <Field label="Colour / markings" htmlFor="color" errors={errors?.color}>
          <Input id="color" name="color" defaultValue={initial?.color ?? ""} />
        </Field>
        <Field label="Microchip ID" htmlFor="microchipId" errors={errors?.microchipId}>
          <Input id="microchipId" name="microchipId" defaultValue={initial?.microchipId ?? ""} />
        </Field>
      </div>
      <Field label="Notes" htmlFor="notes" hint="Allergies, temperament, anything a vet or groomer should know" errors={errors?.notes}>
        <Textarea id="notes" name="notes" defaultValue={initial?.notes ?? ""} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <ButtonLink href={cancelHref} variant="ghost">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
