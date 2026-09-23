"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActorRole } from "@/lib/auth-helpers";
import { parseForm } from "@/lib/form";
import { fail, succeed, toActionError, type ActionResult } from "@/lib/action-result";
import { CategorySchema, ClinicReviewSchema } from "@/lib/validation/clinics";
import type { ClinicStatus, Role } from "@/generated/prisma/enums";

function revalidateClinic(slug: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/clinics");
  revalidatePath(`/clinics/${slug}`);
  revalidatePath("/search");
  revalidatePath("/provider");
}

async function setClinicStatus(status: ClinicStatus, formData: FormData): Promise<ActionResult> {
  const actor = await requireActorRole("ADMIN");
  const parsed = parseForm(ClinicReviewSchema, formData);
  if (!parsed.ok) return parsed.result;
  const clinic = await db.clinic.update({
    where: { id: parsed.data.clinicId },
    data: {
      status,
      verifiedAt: status === "VERIFIED" ? new Date() : null,
      verifiedById: status === "VERIFIED" ? actor.id : null,
      rejectionReason: status === "REJECTED" || status === "SUSPENDED" ? parsed.data.reason ?? null : null,
    },
  });
  revalidateClinic(clinic.slug);
  return succeed(undefined);
}

export async function verifyClinicAction(formData: FormData) {
  return setClinicStatus("VERIFIED", formData);
}
export async function rejectClinicAction(formData: FormData) {
  return setClinicStatus("REJECTED", formData);
}
export async function suspendClinicAction(formData: FormData) {
  return setClinicStatus("SUSPENDED", formData);
}

export async function upsertCategoryAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  await requireActorRole("ADMIN");
  const parsed = parseForm(CategorySchema, formData);
  if (!parsed.ok) return parsed.result;
  const { id, parentId, icon, ...rest } = parsed.data;
  try {
    const data = { ...rest, parentId: parentId || null, icon: icon ?? null };
    if (id) {
      if (parentId === id) return fail("A category cannot be its own parent");
      await db.serviceCategory.update({ where: { id }, data });
    } else {
      await db.serviceCategory.create({ data });
    }
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") {
      return fail("That slug is already in use", { slug: ["Already exists"] });
    }
    return toActionError(e);
  }
  revalidatePath("/admin/categories");
  revalidatePath("/search");
  return succeed(undefined);
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  await requireActorRole("ADMIN");
  const usage = await db.service.count({ where: { categoryId: id } });
  if (usage > 0) return fail(`Cannot delete: ${usage} service(s) use this category`);
  const children = await db.serviceCategory.count({ where: { parentId: id } });
  if (children > 0) return fail("Cannot delete: move or delete its sub-categories first");
  await db.serviceCategory.delete({ where: { id } });
  revalidatePath("/admin/categories");
  return succeed(undefined);
}

export async function setUserRoleAction(userId: string, role: Role): Promise<ActionResult> {
  const actor = await requireActorRole("ADMIN");
  if (userId === actor.id) return fail("You cannot change your own role");
  if (!["OWNER", "PROVIDER", "ADMIN"].includes(role)) return fail("Unknown role");
  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
  return succeed(undefined);
}
