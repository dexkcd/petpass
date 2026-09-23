import { describe, expect, it } from "vitest";
import { allowedTransitions, assertTransition, canSetMeetingUrl, type TransitionActor, type TransitionBooking } from "@/lib/booking/transitions";

const now = new Date("2026-09-23T12:00:00Z");
const future = (h: number) => new Date(now.getTime() + h * 3600_000);
const booking = (over: Partial<TransitionBooking>): TransitionBooking => ({
  ownerId: "owner1",
  clinicId: "clinicA",
  status: "PENDING",
  startsAt: future(48),
  endsAt: future(48.5),
  ...over,
});
const owner: TransitionActor = { userId: "owner1", role: "OWNER", memberClinicIds: [] };
const otherOwner: TransitionActor = { userId: "owner2", role: "OWNER", memberClinicIds: [] };
const vet: TransitionActor = { userId: "vet1", role: "PROVIDER", memberClinicIds: ["clinicA"] };
const otherVet: TransitionActor = { userId: "vet9", role: "PROVIDER", memberClinicIds: ["clinicB"] };
const admin: TransitionActor = { userId: "adm", role: "ADMIN", memberClinicIds: [] };

describe("allowedTransitions", () => {
  it("lets the clinic confirm or decline a pending booking", () => {
    expect(allowedTransitions(booking({}), vet, now)).toEqual(["CONFIRMED", "DECLINED"]);
  });
  it("lets the owner cancel a pending booking", () => {
    expect(allowedTransitions(booking({}), owner, now)).toEqual(["CANCELLED_BY_OWNER"]);
  });
  it("gives strangers nothing", () => {
    expect(allowedTransitions(booking({}), otherOwner, now)).toEqual([]);
    expect(allowedTransitions(booking({}), otherVet, now)).toEqual([]);
  });
  it("hides owner cancellation inside the 24h notice window", () => {
    expect(allowedTransitions(booking({ status: "CONFIRMED", startsAt: future(2) }), owner, now)).toEqual([]);
    expect(allowedTransitions(booking({ status: "CONFIRMED", startsAt: future(30) }), owner, now)).toEqual(["CANCELLED_BY_OWNER"]);
  });
  it("offers complete/no-show only once the time has come", () => {
    expect(allowedTransitions(booking({ status: "CONFIRMED" }), vet, now)).toEqual(["CANCELLED_BY_PROVIDER"]);
    const started = booking({ status: "CONFIRMED", startsAt: future(-1), endsAt: future(-0.5) });
    expect(allowedTransitions(started, vet, now)).toEqual(["CANCELLED_BY_PROVIDER", "COMPLETED", "NO_SHOW"]);
  });
  it("lets admins do any defined transition regardless of timing", () => {
    expect(allowedTransitions(booking({ status: "CONFIRMED", startsAt: future(2) }), admin, now)).toEqual([
      "CANCELLED_BY_OWNER",
      "CANCELLED_BY_PROVIDER",
      "COMPLETED",
      "NO_SHOW",
    ]);
  });
  it("offers nothing from terminal states", () => {
    expect(allowedTransitions(booking({ status: "COMPLETED" }), vet, now)).toEqual([]);
    expect(allowedTransitions(booking({ status: "DECLINED" }), owner, now)).toEqual([]);
  });
});

describe("assertTransition", () => {
  it("rejects undefined transitions", () => {
    expect(() => assertTransition(booking({}), "COMPLETED", vet, now)).toThrow(/Cannot change a pending booking/);
  });
  it("rejects the wrong party", () => {
    expect(() => assertTransition(booking({}), "CONFIRMED", owner, now)).toThrow(/Only the clinic/);
    expect(() => assertTransition(booking({}), "CANCELLED_BY_OWNER", vet, now)).toThrow(/Only the pet owner/);
  });
  it("rejects outsiders", () => {
    expect(() => assertTransition(booking({}), "CONFIRMED", otherVet, now)).toThrow(/not part of this booking/);
  });
  it("enforces the owner notice period with a helpful message", () => {
    expect(() => assertTransition(booking({ status: "CONFIRMED", startsAt: future(2) }), "CANCELLED_BY_OWNER", owner, now)).toThrow(/24 hours/);
  });
  it("allows valid transitions", () => {
    expect(() => assertTransition(booking({}), "CONFIRMED", vet, now)).not.toThrow();
    expect(() => assertTransition(booking({ status: "CONFIRMED", startsAt: future(-1), endsAt: future(-0.5) }), "COMPLETED", vet, now)).not.toThrow();
  });
});

describe("canSetMeetingUrl", () => {
  it("is limited to the clinic while the booking is live", () => {
    expect(canSetMeetingUrl(booking({}), vet)).toBe(true);
    expect(canSetMeetingUrl(booking({ status: "CONFIRMED" }), vet)).toBe(true);
    expect(canSetMeetingUrl(booking({ status: "COMPLETED" }), vet)).toBe(false);
    expect(canSetMeetingUrl(booking({}), owner)).toBe(false);
    expect(canSetMeetingUrl(booking({}), admin)).toBe(true);
  });
});
