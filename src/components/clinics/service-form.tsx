"use client";

import { useActionState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import type { ActionResult } from "@/lib/action-result";
import { KIND_LABELS, MODE_LABELS, SPECIES_OPTIONS } from "@/lib/labels";
import type { ServiceKind, ServiceMode, Species } from "@/generated/prisma/enums";

export type CategoryOption = { id: string; name: string; kind: ServiceKind; parentName?: string | null };

export type ServiceFormValues = {
  categoryId?: string;
  name?: string;
  description?: string | null;
  priceCents?: number;
  currency?: string;
  durationMin?: number;
  bufferMin?: number;
  mode?: ServiceMode;
  species?: Species[];
  active?: boolean;
};

export function ServiceForm({
  action,
  categories,
  initial,
  submitLabel,
}: {
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  categories: CategoryOption[];
  initial?: ServiceFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const grouped = (Object.keys(KIND_LABELS) as ServiceKind[]).map((kind) => ({
    kind,
    items: categories.filter((c) => c.kind === kind),
  }));
  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state && !state.ok ? state.error : undefined} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Service name" htmlFor="name" errors={errors?.name} className="sm:col-span-2">
          <Input id="name" name="name" defaultValue={initial?.name ?? ""} placeholder="e.g. Online consultation, Full groom, Reptile health check" required />
        </Field>
        <Field label="Category" htmlFor="categoryId" errors={errors?.categoryId}>
          <Select id="categoryId" name="categoryId" defaultValue={initial?.categoryId ?? ""} required>
            <option value="">Choose…</option>
            {grouped.map((g) => (
              <optgroup key={g.kind} label={KIND_LABELS[g.kind]}>
                {g.items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentName ? `${c.parentName} › ` : ""}
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
        <Field label="How it's delivered" htmlFor="mode" errors={errors?.mode}>
          <Select id="mode" name="mode" defaultValue={initial?.mode ?? "IN_PERSON"}>
            {(Object.entries(MODE_LABELS) as Array<[ServiceMode, string]>).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Price" htmlFor="price" errors={errors?.price}>
          <div className="flex gap-2">
            <Input id="currency" name="currency" defaultValue={initial?.currency ?? "GBP"} maxLength={3} className="w-20 uppercase" />
            <Input id="price" name="price" type="number" step="0.01" min="0" defaultValue={initial?.priceCents !== undefined ? (initial.priceCents / 100).toFixed(2) : ""} required />
          </div>
        </Field>
        <Field label="Duration (minutes)" htmlFor="durationMin" errors={errors?.durationMin}>
          <Input id="durationMin" name="durationMin" type="number" min={5} max={480} step={5} defaultValue={initial?.durationMin ?? 30} required />
        </Field>
        <Field label="Buffer after (minutes)" htmlFor="bufferMin" hint="Clean-up or travel time before the next booking" errors={errors?.bufferMin}>
          <Input id="bufferMin" name="bufferMin" type="number" min={0} max={120} step={5} defaultValue={initial?.bufferMin ?? 0} />
        </Field>
        <Field label="Status" htmlFor="active" errors={errors?.active}>
          <Select id="active" name="active" defaultValue={initial?.active === false ? "false" : "true"}>
            <option value="true">Bookable</option>
            <option value="false">Hidden</option>
          </Select>
        </Field>
      </div>
      <Field label="Description" htmlFor="description" errors={errors?.description}>
        <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} />
      </Field>
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Species</legend>
        <p className="mb-2 text-xs text-muted">Leave all unticked to accept every species.</p>
        <div className="flex flex-wrap gap-2">
          {SPECIES_OPTIONS.map(([value, label]) => (
            <label key={value} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm has-checked:border-primary has-checked:bg-teal-50">
              <input type="checkbox" name="species[]" value={value} defaultChecked={initial?.species?.includes(value)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <ButtonLink href="/provider/services" variant="ghost">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
