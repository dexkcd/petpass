import "server-only";
import { db } from "@/lib/db";
import { getMemberships, type SessionUser } from "@/lib/auth-helpers";
import { allowedTransitions, canSetMeetingUrl, type TransitionActor } from "@/lib/booking/transitions";
import { getPetAccess } from "@/lib/authz/records";

export const bookingInclude = {
  pet: { select: { id: true, name: true, species: true, breed: true, ownerId: true } },
  owner: { select: { id: true, name: true, email: true, phone: true } },
  clinic: { select: { id: true, name: true, slug: true, timezone: true, addressLine1: true, city: true, postalCode: true, phone: true } },
  service: { select: { id: true, name: true, durationMin: true, mode: true } },
  staff: { select: { id: true, name: true } },
  visitNote: { select: { id: true } },
} as const;

/** Load a booking with everything the detail pages need, plus what this user may do with it. */
export async function loadBookingForUser(bookingId: string, user: SessionUser) {
  const booking = await db.booking.findUnique({ where: { id: bookingId }, include: bookingInclude });
  if (!booking) return null;
  const memberships = user.role === "PROVIDER" ? await getMemberships(user.id) : [];
  const actor: TransitionActor = { userId: user.id, role: user.role, memberClinicIds: memberships.map((m) => m.clinicId) };
  const isOwner = booking.ownerId === user.id;
  const isClinic = actor.memberClinicIds.includes(booking.clinicId) || user.role === "ADMIN";
  if (!isOwner && !isClinic) return null;
  const now = new Date();
  const [access] = await Promise.all([isClinic ? getPetAccess(user, booking.petId) : Promise.resolve(null)]);
  return {
    booking,
    isOwner,
    isClinic,
    allowed: allowedTransitions(booking, actor, now),
    canSetMeeting: canSetMeetingUrl(booking, actor),
    recordAccess: access,
  };
}
