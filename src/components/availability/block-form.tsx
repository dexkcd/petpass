"use client";

import { useActionState } from "react";
import { createBlockAction } from "@/actions/availability";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess, Input, Select } from "@/components/ui/form";
import type { StaffOption } from "@/components/availability/availability-editor";

export function BlockForm({ clinicId, staff }: { clinicId: string; staff: StaffOption[] }) {
  const [state, formAction, pending] = useActionState(createBlockAction.bind(null, clinicId), undefined);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state && !state.ok ? state.error : undefined} />
      <FormSuccess message={state?.ok ? "Time off added" : undefined} />
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="From" htmlFor="block-start" errors={errors?.startsAt}>
          <Input id="block-start" name="startsAt" type="datetime-local" required />
        </Field>
        <Field label="To" htmlFor="block-end" errors={errors?.endsAt}>
          <Input id="block-end" name="endsAt" type="datetime-local" required />
        </Field>
        <Field label="Applies to" htmlFor="block-staff" errors={errors?.staffId}>
          <Select id="block-staff" name="staffId" defaultValue="">
            <option value="">Whole clinic</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reason" htmlFor="block-reason" errors={errors?.reason}>
          <Input id="block-reason" name="reason" placeholder="Holiday, training…" />
        </Field>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add time off"}
      </Button>
    </form>
  );
}
