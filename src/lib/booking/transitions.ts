import type { BookingStatus, Role } from "@/generated/prisma/enums";
import { ForbiddenError, InvalidTransitionError } from "@/lib/action-result";

export type TransitionActor = { userId: string; role: Role; memberClinicIds: string[] };
export type TransitionBooking = { ownerId: string; clinicId: string; status: BookingStatus; startsAt: Date; endsAt: Date };

type Party = "OWNER" | "PROVIDER";
type Rule = { from: BookingStatus; to: BookingStatus; by: Party; when?: (b: TransitionBooking, now: Date) => string | null };

const HOUR = 3600_000;

export const OWNER_CANCEL_NOTICE_HOURS = 24;

export const TRANSITIONS: Rule[] = [
  { from: "PENDING", to: "CONFIRMED", by: "PROVIDER" },
  { from: "PENDING", to: "DECLINED", by: "PROVIDER" },
  { from: "PENDING", to: "CANCELLED_BY_OWNER", by: "OWNER" },
  {
    from: "CONFIRMED",
    to: "CANCELLED_BY_OWNER",
    by: "OWNER",
    when: (b, now) =>
      b.startsAt.getTime() - now.getTime() >= OWNER_CANCEL_NOTICE_HOURS * HOUR
        ? null
        : `Bookings can be cancelled online up to ${OWNER_CANCEL_NOTICE_HOURS} hours before they start. Please contact the clinic.`,
  },
  { from: "CONFIRMED", to: "CANCELLED_BY_PROVIDER", by: "PROVIDER" },
  {
    from: "CONFIRMED",
    to: "COMPLETED",
    by: "PROVIDER",
    when: (b, now) => (now.getTime() >= b.startsAt.getTime() ? null : "The appointment has not started yet"),
  },
  {
    from: "CONFIRMED",
    to: "NO_SHOW",
    by: "PROVIDER",
    when: (b, now) => (now.getTime() >= b.endsAt.getTime() ? null : "Wait until the appointment time has passed"),
  },
];

export const TERMINAL_STATUSES: BookingStatus[] = ["DECLINED", "CANCELLED_BY_OWNER", "CANCELLED_BY_PROVIDER", "COMPLETED", "NO_SHOW"];

function partyOf(actor: TransitionActor, booking: TransitionBooking): Party | "ADMIN" | null {
  if (actor.role === "ADMIN") return "ADMIN";
  if (booking.ownerId === actor.userId) return "OWNER";
  if (actor.memberClinicIds.includes(booking.clinicId)) return "PROVIDER";
  return null;
}

/** Transitions the actor may perform right now (for rendering buttons). */
export function allowedTransitions(booking: TransitionBooking, actor: TransitionActor, now: Date): BookingStatus[] {
  const party = partyOf(actor, booking);
  if (!party) return [];
  return TRANSITIONS.filter((t) => t.from === booking.status && (party === "ADMIN" || t.by === party) && !(t.when && party !== "ADMIN" && t.when(booking, now))).map(
    (t) => t.to,
  );
}

/** Throws when the actor may not move the booking to `next`. */
export function assertTransition(booking: TransitionBooking, next: BookingStatus, actor: TransitionActor, now: Date) {
  const party = partyOf(actor, booking);
  if (!party) throw new ForbiddenError("You are not part of this booking");
  const rule = TRANSITIONS.find((t) => t.from === booking.status && t.to === next);
  if (!rule) throw new InvalidTransitionError(`Cannot change a ${booking.status.toLowerCase()} booking to ${next.toLowerCase()}`);
  if (party === "ADMIN") return;
  if (rule.by !== party) throw new ForbiddenError("Only the " + (rule.by === "OWNER" ? "pet owner" : "clinic") + " can do that");
  const problem = rule.when?.(booking, now);
  if (problem) throw new InvalidTransitionError(problem);
}

export function canSetMeetingUrl(booking: TransitionBooking, actor: TransitionActor) {
  const party = partyOf(actor, booking);
  return (party === "PROVIDER" || party === "ADMIN") && (booking.status === "PENDING" || booking.status === "CONFIRMED");
}
