import "server-only";
import { db } from "@/lib/db";
import { generateSlots } from "@/lib/booking/slots";
import { addDaysISO, localDateStart } from "@/lib/time";
import { NotFoundError } from "@/lib/action-result";

/** Bookable slots for a service on a clinic-local date. Throws NotFoundError for unavailable services. */
export async function slotsForService(serviceId: string, dateISO: string, staffId?: string, now: Date = new Date()) {
  const service = await db.service.findUnique({
    where: { id: serviceId },
    include: { clinic: { select: { id: true, name: true, slug: true, timezone: true, status: true } } },
  });
  if (!service || !service.active || service.clinic.status !== "VERIFIED") {
    throw new NotFoundError("This service is not available for booking");
  }
  const tz = service.clinic.timezone;
  const rangeStart = localDateStart(addDaysISO(dateISO, -1), tz);
  const rangeEnd = localDateStart(addDaysISO(dateISO, 2), tz);

  const [rules, bookings, blocks] = await Promise.all([
    db.availability.findMany({ where: { clinicId: service.clinicId }, select: { weekday: true, startMinutes: true, endMinutes: true, staffId: true } }),
    db.booking.findMany({
      where: { clinicId: service.clinicId, status: { in: ["PENDING", "CONFIRMED"] }, startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } },
      select: { startsAt: true, endsAt: true, staffId: true },
    }),
    db.availabilityBlock.findMany({
      where: { clinicId: service.clinicId, startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } },
      select: { startsAt: true, endsAt: true, staffId: true },
    }),
  ]);

  const slots = generateSlots({
    date: dateISO,
    timezone: tz,
    durationMin: service.durationMin,
    bufferMin: service.bufferMin,
    rules,
    bookings,
    blocks,
    staffId,
    now,
  });
  return { service, slots };
}
