"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActor, requireMembership } from "@/lib/auth-helpers";
import { fail, succeed, toActionError, type ActionResult } from "@/lib/action-result";
import { localInputToUtc } from "@/lib/time";
import { BlockSchema, WeeklyAvailabilitySchema } from "@/lib/validation/bookings";

async function assertStaff(clinicId: string, staffId: string | undefined) {
  if (!staffId) return null;
  const m = await db.membership.findFirst({ where: { clinicId, userId: staffId, active: true } });
  if (!m) throw new Error("Unknown staff member");
  return staffId;
}

export async function saveWeeklyAvailabilityAction(
  clinicId: string,
  input: { staffId?: string; rules: Array<{ weekday: number; startMinutes: number; endMinutes: number }> },
): Promise<ActionResult> {
  const actor = await requireActor();
  try {
    await requireMembership(actor, clinicId);
    const parsed = WeeklyAvailabilitySchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid availability");
    const staffId = await assertStaff(clinicId, parsed.data.staffId);
    await db.$transaction([
      db.availability.deleteMany({ where: { clinicId, staffId } }),
      db.availability.createMany({ data: parsed.data.rules.map((r) => ({ ...r, clinicId, staffId })) }),
    ]);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/provider/availability");
  return succeed(undefined);
}

export async function createBlockAction(clinicId: string, _prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const actor = await requireActor();
  try {
    await requireMembership(actor, clinicId);
    const parsed = BlockSchema.safeParse({
      staffId: formData.get("staffId") || undefined,
      startsAt: formData.get("startsAt"),
      endsAt: formData.get("endsAt"),
      reason: formData.get("reason") || undefined,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const i of parsed.error.issues) (fieldErrors[String(i.path[0] ?? "_")] ??= []).push(i.message);
      return fail("Please fix the highlighted fields", fieldErrors);
    }
    const clinic = await db.clinic.findUniqueOrThrow({ where: { id: clinicId }, select: { timezone: true } });
    const staffId = await assertStaff(clinicId, parsed.data.staffId);
    await db.availabilityBlock.create({
      data: {
        clinicId,
        staffId,
        startsAt: localInputToUtc(parsed.data.startsAt, clinic.timezone),
        endsAt: localInputToUtc(parsed.data.endsAt, clinic.timezone),
        reason: parsed.data.reason ?? null,
      },
    });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/provider/availability");
  return succeed(undefined);
}

export async function deleteBlockAction(clinicId: string, blockId: string): Promise<ActionResult> {
  const actor = await requireActor();
  try {
    await requireMembership(actor, clinicId);
    await db.availabilityBlock.deleteMany({ where: { id: blockId, clinicId } });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/provider/availability");
  return succeed(undefined);
}
