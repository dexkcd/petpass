import type { Metadata } from "next";
import { deleteCategoryAction } from "@/actions/admin";
import { CategoryForm } from "@/components/admin/category-form";
import { Card, CardTitle, PageHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { db } from "@/lib/db";
import { KIND_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Service categories" };

export default async function CategoriesPage() {
  const categories = await db.serviceCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { services: true, children: true } } },
  });
  const parents = categories.filter((c) => !c.parentId).map((c) => ({ id: c.id, name: c.name }));
  return (
    <>
      <PageHeader title="Service categories" description="The taxonomy owners search by. Includes niche specialities and grooming sub-types." />
      <div className="space-y-6">
        <Card>
          <CardTitle>Add a category</CardTitle>
          <div className="mt-3">
            <CategoryForm parents={parents} />
          </div>
        </Card>
        {categories.map((c) => (
          <details key={c.id} className="rounded-xl border border-border bg-card">
            <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-sm">
              <span className="font-medium">
                {c.icon ? `${c.icon} ` : ""}
                {c.parentId ? "↳ " : ""}
                {c.name} <span className="font-normal text-muted">· {KIND_LABELS[c.kind]} · /{c.slug}</span>
              </span>
              <span className="text-xs text-muted">
                {c._count.services} services{c._count.children ? ` · ${c._count.children} sub` : ""}
              </span>
            </summary>
            <div className="border-t border-border p-5">
              <CategoryForm parents={parents} initial={c} />
              <div className="mt-3">
                <ConfirmButton action={deleteCategoryAction.bind(null, c.id)} confirm={`Delete "${c.name}"?`} className="text-danger">
                  Delete category
                </ConfirmButton>
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
