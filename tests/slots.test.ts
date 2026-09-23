import { describe, expect, it } from "vitest";
import { generateSlots, type WeeklyRule } from "@/lib/booking/slots";

const TZ = "Europe/London";
const clinicRules: WeeklyRule[] = [
  { weekday: 1, startMinutes: 9 * 60, endMinutes: 12 * 60, staffId: null }, // Monday 09:00-12:00
];
const base = { timezone: TZ, durationMin: 30, rules: clinicRules, bookings: [], blocks: [], now: new Date("2026-09-01T00:00:00Z") };
const monday = "2026-09-07"; // BST (UTC+1)
const hh = (d: Date) => d.toISOString().slice(11, 16);

describe("generateSlots", () => {
  it("produces 15-minute steps inside the window, in UTC, respecting BST", () => {
    const slots = generateSlots({ ...base, date: monday });
    // 09:00 local = 08:00Z; last 30-min slot starts 11:30 local = 10:30Z
    expect(hh(slots[0])).toBe("08:00");
    expect(hh(slots[slots.length - 1])).toBe("10:30");
    expect(slots).toHaveLength(11);
  });

  it("returns nothing on a closed day", () => {
    expect(generateSlots({ ...base, date: "2026-09-06" })).toHaveLength(0); // Sunday
  });

  it("drops slots before now + lead time", () => {
    const now = new Date("2026-09-07T08:20:00Z"); // 09:20 local
    const slots = generateSlots({ ...base, date: monday, now, minLeadMin: 60 });
    expect(hh(slots[0])).toBe("09:30"); // first start >= 10:20 local -> 10:30 local = 09:30Z
  });

  it("removes candidates overlapping a booking, including the service buffer", () => {
    const booking = { startsAt: new Date("2026-09-07T09:00:00Z"), endsAt: new Date("2026-09-07T09:30:00Z"), staffId: null };
    const without = generateSlots({ ...base, date: monday, bookings: [booking] }).map(hh);
    expect(without).not.toContain("08:45"); // 08:45-09:15 overlaps
    expect(without).not.toContain("09:00");
    expect(without).not.toContain("09:15");
    expect(without).toContain("09:30");
    const withBuffer = generateSlots({ ...base, date: monday, bookings: [booking], bufferMin: 15 }).map(hh);
    expect(withBuffer).not.toContain("09:30"); // booking end extended to 09:45
    expect(withBuffer).not.toContain("08:30"); // 08:30 + 30 + 15 buffer = 09:15 > 09:00
    expect(withBuffer).toContain("09:45");
  });

  it("removes candidates overlapping a block", () => {
    const block = { startsAt: new Date("2026-09-07T08:00:00Z"), endsAt: new Date("2026-09-07T10:00:00Z"), staffId: null };
    const slots = generateSlots({ ...base, date: monday, blocks: [block] }).map(hh);
    expect(slots).toEqual(["10:00", "10:15", "10:30"]);
  });

  it("uses staff-specific rules when the staff member has any for that weekday", () => {
    const rules: WeeklyRule[] = [...clinicRules, { weekday: 1, startMinutes: 14 * 60, endMinutes: 15 * 60, staffId: "vet1" }];
    const slots = generateSlots({ ...base, date: monday, rules, staffId: "vet1" }).map(hh);
    expect(slots).toEqual(["13:00", "13:15", "13:30"]); // 14:00-15:00 local
    // A different staff member falls back to the clinic-wide rule
    expect(generateSlots({ ...base, date: monday, rules, staffId: "vet2" })).toHaveLength(11);
  });

  it("ignores another staff member's bookings when a staff member is requested", () => {
    const other = { startsAt: new Date("2026-09-07T08:00:00Z"), endsAt: new Date("2026-09-07T11:00:00Z"), staffId: "vet2" };
    expect(generateSlots({ ...base, date: monday, bookings: [other], staffId: "vet1" })).toHaveLength(11);
    // But with no staff requested, any booking counts
    expect(generateSlots({ ...base, date: monday, bookings: [other] })).toHaveLength(0);
  });

  it("handles the autumn DST transition day (25 Oct 2026 in London)", () => {
    const rules: WeeklyRule[] = [{ weekday: 0, startMinutes: 0, endMinutes: 4 * 60, staffId: null }]; // Sunday 00:00-04:00 local
    const slots = generateSlots({ ...base, rules, date: "2026-10-25", durationMin: 60, stepMin: 60 });
    // Local 00:00 BST = 23:00Z (24 Oct); clocks go back at 02:00 BST -> 01:00 GMT, so the window spans 5 real hours.
    expect(slots[0].toISOString()).toBe("2026-10-24T23:00:00.000Z");
    expect(slots[slots.length - 1].toISOString()).toBe("2026-10-25T03:00:00.000Z");
    expect(slots).toHaveLength(5);
  });

  it("does not return a slot that would run past closing", () => {
    const slots = generateSlots({ ...base, date: monday, durationMin: 120 }).map(hh);
    expect(slots[slots.length - 1]).toBe("09:00"); // 10:00-12:00 local
  });
});
