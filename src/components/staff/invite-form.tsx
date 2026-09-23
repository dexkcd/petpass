"use client";

import { useActionState } from "react";
import { inviteStaffAction } from "@/actions/staff";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess, Input, Select } from "@/components/ui/form";

export function InviteStaffForm({ clinicId }: { clinicId: string }) {
  const [state, formAction, pending] = useActionState(inviteStaffAction.bind(null, clinicId), undefined);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state && !state.ok ? state.error : undefined} />
      <FormSuccess message={state?.ok ? "Staff member added" : undefined} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Account email" htmlFor="staff-email" hint="They must already have a provider account" errors={errors?.email}>
          <Input id="staff-email" name="email" type="email" required />
        </Field>
        <Field label="Role" htmlFor="staff-role" errors={errors?.role}>
          <Select id="staff-role" name="role" defaultValue="STAFF">
            <option value="STAFF">Staff</option>
            <option value="CLINIC_OWNER">Co-owner</option>
          </Select>
        </Field>
        <Field label="Job title" htmlFor="staff-title" errors={errors?.title}>
          <Input id="staff-title" name="title" placeholder="e.g. Veterinary surgeon, Groomer" />
        </Field>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add staff member"}
      </Button>
    </form>
  );
}
