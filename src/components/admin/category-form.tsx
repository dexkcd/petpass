"use client";

import { useActionState } from "react";
import { upsertCategoryAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess, Input, Select } from "@/components/ui/form";
import { KIND_LABELS } from "@/lib/labels";
import type { ServiceKind } from "@/generated/prisma/enums";

export function CategoryForm({
  parents,
  initial,
}: {
  parents: Array<{ id: string; name: string }>;
  initial?: { id: string; slug: string; name: string; kind: ServiceKind; parentId: string | null; sortOrder: number; icon: string | null };
}) {
  const [state, formAction, pending] = useActionState(upsertCategoryAction, undefined);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="space-y-3">
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <FormError message={state && !state.ok ? state.error : undefined} />
      <FormSuccess message={state?.ok ? "Saved" : undefined} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Name" htmlFor={`cat-name-${initial?.id ?? "new"}`} errors={errors?.name}>
          <Input id={`cat-name-${initial?.id ?? "new"}`} name="name" defaultValue={initial?.name ?? ""} required />
        </Field>
        <Field label="Slug" htmlFor={`cat-slug-${initial?.id ?? "new"}`} errors={errors?.slug}>
          <Input id={`cat-slug-${initial?.id ?? "new"}`} name="slug" defaultValue={initial?.slug ?? ""} pattern="[a-z0-9-]+" required />
        </Field>
        <Field label="Kind" htmlFor={`cat-kind-${initial?.id ?? "new"}`} errors={errors?.kind}>
          <Select id={`cat-kind-${initial?.id ?? "new"}`} name="kind" defaultValue={initial?.kind ?? "VET"}>
            {(Object.entries(KIND_LABELS) as Array<[ServiceKind, string]>).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Parent" htmlFor={`cat-parent-${initial?.id ?? "new"}`} errors={errors?.parentId}>
          <Select id={`cat-parent-${initial?.id ?? "new"}`} name="parentId" defaultValue={initial?.parentId ?? ""}>
            <option value="">None (top level)</option>
            {parents
              .filter((p) => p.id !== initial?.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Sort order" htmlFor={`cat-sort-${initial?.id ?? "new"}`} errors={errors?.sortOrder}>
          <Input id={`cat-sort-${initial?.id ?? "new"}`} name="sortOrder" type="number" min={0} defaultValue={initial?.sortOrder ?? 0} />
        </Field>
        <Field label="Icon (emoji)" htmlFor={`cat-icon-${initial?.id ?? "new"}`} errors={errors?.icon}>
          <Input id={`cat-icon-${initial?.id ?? "new"}`} name="icon" maxLength={8} defaultValue={initial?.icon ?? ""} />
        </Field>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : initial ? "Save" : "Add category"}
      </Button>
    </form>
  );
}
