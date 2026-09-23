"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import {
  addConditionAction,
  addMedicationAction,
  addVaccinationAction,
  addVisitNoteAction,
  uploadDocumentAction,
} from "@/actions/records";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess, Input, Select, Textarea } from "@/components/ui/form";
import type { ActionResult } from "@/lib/action-result";

type FormAction = (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;

function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-border bg-slate-50">
      <summary className="cursor-pointer select-none px-4 py-2 text-sm font-medium">{title}</summary>
      <div className="border-t border-border bg-card p-4">{children}</div>
    </details>
  );
}

function useRecordForm(action: FormAction) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const error = state && !state.ok ? state.error : undefined;
  const success = state?.ok ? "Saved" : undefined;
  return { formAction, pending, ref, errors, error, success };
}

export function VaccinationForm({ petId }: { petId: string }) {
  const { formAction, pending, ref, errors, error, success } = useRecordForm(addVaccinationAction);
  return (
    <Disclosure title="+ Add vaccination">
      <form ref={ref} action={formAction} className="space-y-3">
        <input type="hidden" name="petId" value={petId} />
        <FormError message={error} />
        <FormSuccess message={success} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Vaccine" htmlFor="vac-name" errors={errors?.name}>
            <Input id="vac-name" name="name" placeholder="e.g. Rabies, DHPP, FVRCP" required />
          </Field>
          <Field label="Given on" htmlFor="vac-date" errors={errors?.administeredAt}>
            <Input id="vac-date" name="administeredAt" type="date" required />
          </Field>
          <Field label="Expires / booster due" htmlFor="vac-exp" errors={errors?.expiresAt}>
            <Input id="vac-exp" name="expiresAt" type="date" />
          </Field>
          <Field label="Lot number" htmlFor="vac-lot" errors={errors?.lotNumber}>
            <Input id="vac-lot" name="lotNumber" />
          </Field>
          <Field label="Administered by" htmlFor="vac-by" errors={errors?.administeredBy}>
            <Input id="vac-by" name="administeredBy" placeholder="Vet or clinic name" />
          </Field>
        </div>
        <Field label="Notes" htmlFor="vac-notes" errors={errors?.notes}>
          <Textarea id="vac-notes" name="notes" className="min-h-16" />
        </Field>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Add vaccination"}
        </Button>
      </form>
    </Disclosure>
  );
}

export function MedicationForm({ petId }: { petId: string }) {
  const { formAction, pending, ref, errors, error, success } = useRecordForm(addMedicationAction);
  return (
    <Disclosure title="+ Add medication">
      <form ref={ref} action={formAction} className="space-y-3">
        <input type="hidden" name="petId" value={petId} />
        <FormError message={error} />
        <FormSuccess message={success} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Medication" htmlFor="med-name" errors={errors?.name}>
            <Input id="med-name" name="name" required />
          </Field>
          <Field label="Dosage" htmlFor="med-dose" errors={errors?.dosage}>
            <Input id="med-dose" name="dosage" placeholder="e.g. 5 mg" required />
          </Field>
          <Field label="Frequency" htmlFor="med-freq" errors={errors?.frequency}>
            <Input id="med-freq" name="frequency" placeholder="e.g. twice daily with food" required />
          </Field>
          <Field label="Prescribed by" htmlFor="med-by" errors={errors?.prescribedBy}>
            <Input id="med-by" name="prescribedBy" />
          </Field>
          <Field label="Start date" htmlFor="med-start" errors={errors?.startDate}>
            <Input id="med-start" name="startDate" type="date" required />
          </Field>
          <Field label="End date" htmlFor="med-end" errors={errors?.endDate}>
            <Input id="med-end" name="endDate" type="date" />
          </Field>
        </div>
        <Field label="Notes" htmlFor="med-notes" errors={errors?.notes}>
          <Textarea id="med-notes" name="notes" className="min-h-16" />
        </Field>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Add medication"}
        </Button>
      </form>
    </Disclosure>
  );
}

export function ConditionForm({ petId }: { petId: string }) {
  const { formAction, pending, ref, errors, error, success } = useRecordForm(addConditionAction);
  return (
    <Disclosure title="+ Add condition or allergy">
      <form ref={ref} action={formAction} className="space-y-3">
        <input type="hidden" name="petId" value={petId} />
        <FormError message={error} />
        <FormSuccess message={success} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Condition" htmlFor="cond-name" errors={errors?.name}>
            <Input id="cond-name" name="name" placeholder="e.g. Hip dysplasia, Chicken allergy" required />
          </Field>
          <Field label="Severity" htmlFor="cond-sev" errors={errors?.severity}>
            <Select id="cond-sev" name="severity" defaultValue="">
              <option value="">Not specified</option>
              <option value="MILD">Mild</option>
              <option value="MODERATE">Moderate</option>
              <option value="SEVERE">Severe</option>
            </Select>
          </Field>
          <Field label="Diagnosed on" htmlFor="cond-date" errors={errors?.diagnosedAt}>
            <Input id="cond-date" name="diagnosedAt" type="date" />
          </Field>
        </div>
        <Field label="Notes" htmlFor="cond-notes" errors={errors?.notes}>
          <Textarea id="cond-notes" name="notes" className="min-h-16" />
        </Field>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Add condition"}
        </Button>
      </form>
    </Disclosure>
  );
}

export function VisitNoteForm({
  petId,
  clinics,
  fixedClinicId,
  bookingId,
  title = "+ Add visit note",
}: {
  petId: string;
  clinics?: Array<{ id: string; name: string }>;
  fixedClinicId?: string;
  bookingId?: string;
  title?: string;
}) {
  const { formAction, pending, ref, errors, error, success } = useRecordForm(addVisitNoteAction);
  return (
    <Disclosure title={title}>
      <form ref={ref} action={formAction} className="space-y-3">
        <input type="hidden" name="petId" value={petId} />
        {bookingId ? <input type="hidden" name="bookingId" value={bookingId} /> : null}
        {fixedClinicId ? <input type="hidden" name="clinicId" value={fixedClinicId} /> : null}
        <FormError message={error} />
        <FormSuccess message={success} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Visit date" htmlFor="visit-date" errors={errors?.visitedAt}>
            <Input id="visit-date" name="visitedAt" type="date" required />
          </Field>
          {!fixedClinicId && clinics ? (
            <Field label="Clinic" htmlFor="visit-clinic" errors={errors?.clinicId}>
              <Select id="visit-clinic" name="clinicId" defaultValue="">
                <option value="">Choose a clinic</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="Follow-up on" htmlFor="visit-follow" errors={errors?.followUpAt}>
            <Input id="visit-follow" name="followUpAt" type="date" />
          </Field>
        </div>
        <Field label="Summary" htmlFor="visit-summary" errors={errors?.summary}>
          <Textarea id="visit-summary" name="summary" required />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Diagnosis" htmlFor="visit-dx" errors={errors?.diagnosis}>
            <Textarea id="visit-dx" name="diagnosis" className="min-h-16" />
          </Field>
          <Field label="Treatment" htmlFor="visit-tx" errors={errors?.treatment}>
            <Textarea id="visit-tx" name="treatment" className="min-h-16" />
          </Field>
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Add visit note"}
        </Button>
      </form>
    </Disclosure>
  );
}

export function DocumentForm({ petId }: { petId: string }) {
  const { formAction, pending, ref, errors, error, success } = useRecordForm(uploadDocumentAction);
  return (
    <Disclosure title="+ Upload document">
      <form ref={ref} action={formAction} className="space-y-3" encType="multipart/form-data">
        <input type="hidden" name="petId" value={petId} />
        <FormError message={error} />
        <FormSuccess message={success} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title" htmlFor="doc-title" errors={errors?.title}>
            <Input id="doc-title" name="title" placeholder="e.g. Blood test results, Insurance certificate" required />
          </Field>
          <Field label="File" htmlFor="doc-file" hint="PDF or image, up to 10 MB" errors={errors?.file}>
            <Input id="doc-file" name="file" type="file" accept="application/pdf,image/*" required />
          </Field>
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </Button>
      </form>
    </Disclosure>
  );
}
