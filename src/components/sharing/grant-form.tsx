"use client";

import { useActionState } from "react";
import { grantAccessAction } from "@/actions/access";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess, Select } from "@/components/ui/form";

export function GrantForm({
  petId,
  clinics,
  preselectedClinicId,
}: {
  petId: string;
  clinics: Array<{ id: string; name: string; city: string }>;
  preselectedClinicId?: string;
}) {
  const [state, formAction, pending] = useActionState(grantAccessAction, undefined);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="petId" value={petId} />
      <FormError message={state && !state.ok ? state.error : undefined} />
      <FormSuccess message={state?.ok ? "Access granted" : undefined} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Clinic" htmlFor="clinicId" errors={errors?.clinicId}>
          <Select id="clinicId" name="clinicId" defaultValue={preselectedClinicId ?? ""} required>
            <option value="">Choose a clinic…</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.city}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="They can" htmlFor="scope" errors={errors?.scope}>
          <Select id="scope" name="scope" defaultValue="READ_WRITE">
            <option value="READ_WRITE">View and add records</option>
            <option value="READ">View only</option>
          </Select>
        </Field>
        <Field label="For" htmlFor="expiresInDays" errors={errors?.expiresInDays}>
          <Select id="expiresInDays" name="expiresInDays" defaultValue="90">
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="365">1 year</option>
            <option value="never">Until I revoke it</option>
          </Select>
        </Field>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Sharing…" : "Share records"}
      </Button>
    </form>
  );
}
