"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getMemberships, requireActor, type SessionUser } from "@/lib/auth-helpers";
import { slotsForService } from "@/lib/booking/service";
import { assertTransition, canSetMeetingUrl, type TransitionActor } from "@/lib/booking/transitions";
import { parseForm } from "@/lib/form";
import { fail, succeed, toActionError, type ActionResult, ForbiddenError, NotFoundError } from "@/lib/action-result";
import { toLocalDateISO } from "@/lib/time";
import { CreateBookingSchema, MAX_BOOKING_DAYS_AHEAD, MeetingUrlSchema, ProviderNotesSchema, TransitionSchema } from "@/lib/validation/bookings";
import type { BookingStatus } from "@/generated/prisma/enums";

async function transitionActor(user: SessionUser): Promise<TransitionActor> {
  const memberships = user.role === "PROVIDER" ? await getMemberships(user.id) : [];
  return { userId: user.id, role: user.role, memberClinicIds: memberships.map((m) => m.clinicId) };
}

function revalidateBooking(id: string) {
  revalidatePath("/owner");
  revalidatePath("/owner/bookings");
  revalidatePath(`/owner/bookings/${id}`);
  revalidatePath("/provider");
  revalidatePath("/provider/bookings");
  revalidatePath(`/provider/bookings/${id}`);
}

export async function createBookingAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const actor = await requireActor();
  if (actor.role === "PROVIDER") return fail("Provider accounts cannot book. Use a pet-owner account.");
  const parsed = parseForm(CreateBookingSchema, formData);
  if (!parsed.ok) return parsed.result;
  const { serviceId, petId, staffId, ownerNotes } = parsed.data;
  const startsAt = new Date(parsed.data.startsAt);

  const pet = await db.pet.findFirst({ where: { id: petId, ownerId: actor.id, deletedAt: null } });
  if (!pet) return fail("Choose one of your pets", { petId: ["Not found"] });

  let bookingId: string;
  try {
    const now = new Date();
    if (startsAt.getTime() > now.getTime() + MAX_BOOKING_DAYS_AHEAD * 86400_000) {
      return fail(`You can book up to ${MAX_BOOKING_DAYS_AHEAD} days ahead`, { startsAt: ["Too far ahead"] });
    }
    const tzRow = await db.service.findUnique({ where: { id: serviceId }, select: { clinic: { select: { timezone: true } } } });
    if (!tzRow) throw new NotFoundError("This service is not available for booking");
    const { service, slots } = await slotsForService(serviceId, toLocalDateISO(startsAt, tzRow.clinic.timezone), staffId, now);

    if (service.species.length > 0 && !service.species.includes(pet.species)) {
      return fail(`${service.name} is not offered for ${pet.species.toLowerCase().replace("_", " ")}s`, { petId: ["Species not supported"] });
    }
    if (!slots.some((s) => s.getTime() === startsAt.getTime())) {
      return fail("That time is no longer available. Please pick another slot.", { startsAt: ["Unavailable"] });
    }
    const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);
    const busyEnd = new Date(endsAt.getTime() + service.bufferMin * 60_000);

    bookingId = await db.$transaction(async (tx) => {
      // Serialise bookings per clinic so two owners cannot take the same slot.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${service.clinicId}))`;
      const clash = await tx.booking.count({
        where: {
          clinicId: service.clinicId,
          status: { in: ["PENDING", "CONFIRMED"] },
          startsAt: { lt: busyEnd },
          endsAt: { gt: startsAt },
          ...(staffId ? { OR: [{ staffId }, { staffId: null }] } : {}),
        },
      });
      if (clash > 0) throw new NotFoundError("That time was just taken. Please pick another slot.");
      const created = await tx.booking.create({
        data: {
          petId,
          ownerId: actor.id,
          clinicId: service.clinicId,
          serviceId: service.id,
          staffId: staffId ?? null,
          startsAt,
          endsAt,
          mode: service.mode,
          priceCents: service.priceCents,
          currency: service.currency,
          ownerNotes: ownerNotes ?? null,
        },
      });
      return created.id;
    });
  } catch (e) {
    return toActionError(e);
  }
  revalidateBooking(bookingId);
  redirect(`/owner/bookings/${bookingId}?new=1`);
}

export async function transitionBookingAction(input: { bookingId: string; status: BookingStatus; reason?: string }): Promise<ActionResult> {
  const user = await requireActor();
  const parsed = TransitionSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request");
  try {
    const booking = await db.booking.findUnique({ where: { id: parsed.data.bookingId } });
    if (!booking) throw new NotFoundError("Booking not found");
    const actor = await transitionActor(user);
    assertTransition(booking, parsed.data.status, actor, new Date());
    if (parsed.data.status === "CONFIRMED" && booking.mode === "ONLINE" && !booking.meetingUrl) {
      // Allowed, but the UI nudges the clinic to add a link before the appointment.
    }
    await db.booking.update({
      where: { id: booking.id },
      data: {
        status: parsed.data.status,
        cancelReason: parsed.data.status.startsWith("CANCELLED") || parsed.data.status === "DECLINED" ? parsed.data.reason ?? null : booking.cancelReason,
      },
    });
  } catch (e) {
    return toActionError(e);
  }
  revalidateBooking(parsed.data.bookingId);
  return succeed(undefined);
}

export async function setMeetingUrlAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const user = await requireActor();
  const parsed = parseForm(MeetingUrlSchema, formData);
  if (!parsed.ok) return parsed.result;
  try {
    const booking = await db.booking.findUnique({ where: { id: parsed.data.bookingId } });
    if (!booking) throw new NotFoundError("Booking not found");
    const actor = await transitionActor(user);
    if (!canSetMeetingUrl(booking, actor)) throw new ForbiddenError("Only the clinic can set the meeting link while the booking is active");
    await db.booking.update({ where: { id: booking.id }, data: { meetingUrl: parsed.data.meetingUrl } });
  } catch (e) {
    return toActionError(e);
  }
  revalidateBooking(parsed.data.bookingId);
  return succeed(undefined);
}

export async function setProviderNotesAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const user = await requireActor();
  const parsed = parseForm(ProviderNotesSchema, formData);
  if (!parsed.ok) return parsed.result;
  try {
    const booking = await db.booking.findUnique({ where: { id: parsed.data.bookingId } });
    if (!booking) throw new NotFoundError("Booking not found");
    const actor = await transitionActor(user);
    if (user.role !== "ADMIN" && !actor.memberClinicIds.includes(booking.clinicId)) throw new ForbiddenError();
    await db.booking.update({ where: { id: booking.id }, data: { providerNotes: parsed.data.providerNotes ?? null } });
  } catch (e) {
    return toActionError(e);
  }
  revalidateBooking(parsed.data.bookingId);
  return succeed(undefined);
}
