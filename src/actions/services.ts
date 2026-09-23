"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireActor, requireMembership } from "@/lib/auth-helpers";
import { parseForm } from "@/lib/form";
import { fail, succeed, toActionError, type ActionResult, NotFoundError } from "@/lib/action-result";
import { ServiceSchema } from "@/lib/validation/clinics";

function revalidate(clinicSlug: string) {
  revalidatePath("/provider/services");
  revalidatePath(`/clinics/${clinicSlug}`);
  revalidatePath("/search");
}

export async function createServiceAction(
  clinicId: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireActor();
  try {
    await requireMembership(actor, clinicId);
  } catch (e) {
    return toActionError(e);
  }
  const parsed = parseForm(ServiceSchema, formData);
  if (!parsed.ok) return parsed.result;
  const { price, ...rest } = parsed.data;
  const category = await db.serviceCategory.findUnique({ where: { id: rest.categoryId } });
  if (!category) return fail("Choose a valid category", { categoryId: ["Unknown category"] });

  const clinic = await db.clinic.findUnique({ where: { id: clinicId }, select: { slug: true } });
  await db.service.create({ data: { ...rest, description: rest.description ?? null, priceCents: Math.round(price * 100), clinicId } });
  revalidate(clinic?.slug ?? "");
  redirect("/provider/services");
}

export async function updateServiceAction(
  serviceId: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireActor();
  const service = await db.service.findUnique({ where: { id: serviceId }, include: { clinic: { select: { slug: true } } } });
  if (!service) return fail("Service not found");
  try {
    await requireMembership(actor, service.clinicId);
  } catch (e) {
    return toActionError(e);
  }
  const parsed = parseForm(ServiceSchema, formData);
  if (!parsed.ok) return parsed.result;
  const { price, ...rest } = parsed.data;
  await db.service.update({
    where: { id: serviceId },
    data: { ...rest, description: rest.description ?? null, priceCents: Math.round(price * 100) },
  });
  revalidate(service.clinic.slug);
  redirect("/provider/services");
}

export async function toggleServiceAction(serviceId: string): Promise<ActionResult> {
  const actor = await requireActor();
  try {
    const service = await db.service.findUnique({ where: { id: serviceId }, include: { clinic: { select: { slug: true } } } });
    if (!service) throw new NotFoundError("Service not found");
    await requireMembership(actor, service.clinicId);
    await db.service.update({ where: { id: serviceId }, data: { active: !service.active } });
    revalidate(service.clinic.slug);
  } catch (e) {
    return toActionError(e);
  }
  return succeed(undefined);
}

export async function deleteServiceAction(serviceId: string): Promise<ActionResult> {
  const actor = await requireActor();
  try {
    const service = await db.service.findUnique({
      where: { id: serviceId },
      include: { clinic: { select: { slug: true } }, _count: { select: { bookings: true } } },
    });
    if (!service) throw new NotFoundError("Service not found");
    await requireMembership(actor, service.clinicId);
    if (service._count.bookings > 0) {
      // Keep history intact: deactivate instead of deleting.
      await db.service.update({ where: { id: serviceId }, data: { active: false } });
      revalidate(service.clinic.slug);
      return fail("This service has bookings, so it was deactivated instead of deleted");
    }
    await db.service.delete({ where: { id: serviceId } });
    revalidate(service.clinic.slug);
  } catch (e) {
    return toActionError(e);
  }
  return succeed(undefined);
}
