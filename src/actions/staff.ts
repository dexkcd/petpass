"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActor, requireMembership } from "@/lib/auth-helpers";
import { parseForm } from "@/lib/form";
import { fail, succeed, toActionError, type ActionResult, ForbiddenError } from "@/lib/action-result";
import { StaffInviteSchema } from "@/lib/validation/clinics";

export async function inviteStaffAction(
  clinicId: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireActor();
  try {
    const m = await requireMembership(actor, clinicId);
    if (m.role !== "CLINIC_OWNER") throw new ForbiddenError("Only the clinic owner can manage staff");
  } catch (e) {
    return toActionError(e);
  }
  const parsed = parseForm(StaffInviteSchema, formData);
  if (!parsed.ok) return parsed.result;

  const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user) {
    return fail("No PetPass account with that email. Ask them to sign up as a provider first.", { email: ["Not found"] });
  }
  if (user.role !== "PROVIDER") return fail("That account is not a provider account", { email: ["Not a provider"] });

  const other = await db.membership.findFirst({ where: { userId: user.id, active: true, NOT: { clinicId } } });
  if (other) return fail("That person already belongs to another clinic", { email: ["Already a member elsewhere"] });

  await db.membership.upsert({
    where: { userId_clinicId: { userId: user.id, clinicId } },
    update: { active: true, role: parsed.data.role, title: parsed.data.title ?? null },
    create: { userId: user.id, clinicId, role: parsed.data.role, title: parsed.data.title ?? null },
  });
  revalidatePath("/provider/staff");
  return succeed(undefined);
}

export async function removeStaffAction(clinicId: string, membershipId: string): Promise<ActionResult> {
  const actor = await requireActor();
  try {
    const m = await requireMembership(actor, clinicId);
    if (m.role !== "CLINIC_OWNER") throw new ForbiddenError("Only the clinic owner can manage staff");
    const target = await db.membership.findFirst({ where: { id: membershipId, clinicId } });
    if (!target) return fail("Member not found");
    if (target.userId === actor.id) return fail("You cannot remove yourself");
    await db.membership.update({ where: { id: membershipId }, data: { active: false } });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/provider/staff");
  return succeed(undefined);
}
