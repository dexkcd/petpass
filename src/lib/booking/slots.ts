import { localMinutesToUtc, weekdayOf } from "@/lib/time";

export type WeeklyRule = { weekday: number; startMinutes: number; endMinutes: number; staffId: string | null };
export type BusyInterval = { startsAt: Date; endsAt: Date; staffId: string | null };

export type SlotInput = {
  /** Local calendar date, YYYY-MM-DD, in the clinic's zone. */
  date: string;
  timezone: string;
  durationMin: number;
  bufferMin?: number;
  stepMin?: number;
  minLeadMin?: number;
  rules: WeeklyRule[];
  /** Existing PENDING/CONFIRMED bookings (their own buffer already applied by the caller if any). */
  bookings: BusyInterval[];
  /** Time-off blocks. */
  blocks: BusyInterval[];
  /** Requested staff member; undefined means "any / clinic-wide". */
  staffId?: string;
  now: Date;
};

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return bStart < aEnd && bEnd > aStart;
}

/**
 * Compute bookable start times (UTC instants) for one local day.
 *
 * Rules: staff-specific rules override clinic-wide rules for that staff
 * member on that weekday; otherwise clinic-wide rules apply. Each rule
 * boundary is converted to UTC independently, so DST transition days are
 * handled correctly. Busy intervals (bookings extended by the service
 * buffer, and blocks) remove any overlapping candidate. Candidates that
 * start before `now + minLeadMin` are dropped.
 */
export function generateSlots(input: SlotInput): Date[] {
  const { date, timezone, durationMin, rules, bookings, blocks, staffId, now } = input;
  const bufferMin = input.bufferMin ?? 0;
  const stepMin = input.stepMin ?? 15;
  const minLeadMin = input.minLeadMin ?? 60;
  const weekday = weekdayOf(date);

  const dayRules = rules.filter((r) => r.weekday === weekday);
  const staffRules = staffId ? dayRules.filter((r) => r.staffId === staffId) : [];
  const applicable = staffRules.length > 0 ? staffRules : dayRules.filter((r) => r.staffId === null);
  if (applicable.length === 0) return [];

  const relevant = (b: BusyInterval) => b.staffId === null || staffId === undefined || b.staffId === staffId;
  const busy = [
    ...bookings.filter(relevant).map((b) => ({ start: b.startsAt.getTime(), end: b.endsAt.getTime() + bufferMin * 60_000 })),
    ...blocks.filter(relevant).map((b) => ({ start: b.startsAt.getTime(), end: b.endsAt.getTime() })),
  ];

  const earliest = now.getTime() + minLeadMin * 60_000;
  const durationMs = durationMin * 60_000;
  const totalMs = (durationMin + bufferMin) * 60_000;
  const out = new Set<number>();

  for (const rule of applicable) {
    const windowStart = localMinutesToUtc(date, rule.startMinutes, timezone).getTime();
    const windowEnd = localMinutesToUtc(date, rule.endMinutes, timezone).getTime();
    for (let t = windowStart; t + durationMs <= windowEnd; t += stepMin * 60_000) {
      if (t < earliest) continue;
      const candEnd = t + totalMs;
      if (busy.some((b) => overlaps(t, candEnd, b.start, b.end))) continue;
      out.add(t);
    }
  }
  return [...out].sort((a, b) => a - b).map((t) => new Date(t));
}
