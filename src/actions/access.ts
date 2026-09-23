"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth-helpers";
import { requirePetOwner } from "@/lib/authz/records";
import { parseForm } from "@/lib/form";
import { fail, succeed, toActionError, type ActionResult, NotFoundError } from "@/lib/action-result";
import { GrantSchema } from "@/lib/validation/access";

function revalidate(petId: string, clinicId?: string) {
  revalidatePath(`/owner/pets/${petId}`);
  revalidatePath(`/owner/pets/${petId}/sharing`);
  revalidatePath("/owner/bookings");
  revalidatePath("/provider/patients");
  revalidatePath(`/provider/patients/${petId}`);
  if (clinicId) revalidatePath("/provider");
}

export async function grantAccessAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const actor = await requireActor();
  const parsed = parseForm(GrantSchema, formData);
  if (!parsed.ok) return parsed.result;
  const { petId, clinicId, scope, expiresInDays } = parsed.data;
  try {
    await requirePetOwner(actor, petId);
    const clinic = await db.clinic.findFirst({ where: { id: clinicId, status: "VERIFIED" }, select: { id: true, name: true } });
    if (!clinic) return fail("Choose a verified clinic", { clinicId: ["Unknown clinic"] });
    const expiresAt = expiresInDays === "never" ? null : new Date(Date.now() + Number(expiresInDays) * 86400_000);

    // One active grant per pet/clinic: revoke any existing active one first.
    await db.$transaction([
      db.recordAccessGrant.updateMany({ where: { petId, clinicId, revokedAt: null }, data: { revokedAt: new Date() } }),
      db.recordAccessGrant.create({ data: { petId, clinicId, scope, expiresAt, grantedById: actor.id } }),
    ]);
  } catch (e) {
    return toActionError(e);
  }
  revalidate(petId, clinicId);
  return succeed(undefined);
}

export async function revokeAccessAction(petId: string, grantId: string): Promise<ActionResult> {
  const actor = await requireActor();
  try {
    await requirePetOwner(actor, petId);
    const grant = await db.recordAccessGrant.findFirst({ where: { id: grantId, petId } });
    if (!grant) throw new NotFoundError("Grant not found");
    if (!grant.revokedAt) await db.recordAccessGrant.update({ where: { id: grantId }, data: { revokedAt: new Date() } });
  } catch (e) {
    return toActionError(e);
  }
  revalidate(petId);
  return succeed(undefined);
}
