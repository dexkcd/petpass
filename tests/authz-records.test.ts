import { describe, expect, it } from "vitest";
import { decidePetAccess, isGrantActive } from "@/lib/authz/records";

const now = new Date("2026-09-23T12:00:00Z");
const pet = { id: "pet1", ownerId: "owner1", deletedAt: null };
const future = new Date("2026-12-01T00:00:00Z");
const past = new Date("2026-01-01T00:00:00Z");

describe("decidePetAccess", () => {
  it("gives the owner write access", () => {
    const r = decidePetAccess({ actor: { id: "owner1", role: "OWNER" }, pet, memberClinicIds: [], grants: [], now });
    expect(r).toEqual({ level: "WRITE", via: "OWNER" });
  });

  it("denies other owners", () => {
    const r = decidePetAccess({ actor: { id: "owner2", role: "OWNER" }, pet, memberClinicIds: [], grants: [], now });
    expect(r.level).toBe("NONE");
  });

  it("gives admins read-only access", () => {
    const r = decidePetAccess({ actor: { id: "admin", role: "ADMIN" }, pet, memberClinicIds: [], grants: [], now });
    expect(r).toEqual({ level: "READ", via: "ADMIN" });
  });

  it("denies deleted pets to everyone but returns NONE (not found)", () => {
    const r = decidePetAccess({
      actor: { id: "owner1", role: "OWNER" },
      pet: { ...pet, deletedAt: past },
      memberClinicIds: [],
      grants: [],
      now,
    });
    expect(r.level).toBe("NONE");
  });

  it("grants a provider write access through an active READ_WRITE grant to their clinic", () => {
    const r = decidePetAccess({
      actor: { id: "vet1", role: "PROVIDER" },
      pet,
      memberClinicIds: ["clinicA"],
      grants: [{ clinicId: "clinicA", scope: "READ_WRITE", expiresAt: future, revokedAt: null }],
      now,
    });
    expect(r).toEqual({ level: "WRITE", via: "GRANT", clinicId: "clinicA" });
  });

  it("limits a provider to read with a READ grant", () => {
    const r = decidePetAccess({
      actor: { id: "vet1", role: "PROVIDER" },
      pet,
      memberClinicIds: ["clinicA"],
      grants: [{ clinicId: "clinicA", scope: "READ", expiresAt: null, revokedAt: null }],
      now,
    });
    expect(r).toEqual({ level: "READ", via: "GRANT", clinicId: "clinicA" });
  });

  it("ignores grants to clinics the provider does not belong to", () => {
    const r = decidePetAccess({
      actor: { id: "vet1", role: "PROVIDER" },
      pet,
      memberClinicIds: ["clinicB"],
      grants: [{ clinicId: "clinicA", scope: "READ_WRITE", expiresAt: null, revokedAt: null }],
      now,
    });
    expect(r.level).toBe("NONE");
  });

  it("ignores expired grants", () => {
    const r = decidePetAccess({
      actor: { id: "vet1", role: "PROVIDER" },
      pet,
      memberClinicIds: ["clinicA"],
      grants: [{ clinicId: "clinicA", scope: "READ_WRITE", expiresAt: past, revokedAt: null }],
      now,
    });
    expect(r.level).toBe("NONE");
  });

  it("ignores revoked grants immediately", () => {
    const r = decidePetAccess({
      actor: { id: "vet1", role: "PROVIDER" },
      pet,
      memberClinicIds: ["clinicA"],
      grants: [{ clinicId: "clinicA", scope: "READ_WRITE", expiresAt: null, revokedAt: now }],
      now,
    });
    expect(r.level).toBe("NONE");
  });

  it("prefers a write grant when several clinics have grants", () => {
    const r = decidePetAccess({
      actor: { id: "vet1", role: "PROVIDER" },
      pet,
      memberClinicIds: ["clinicA", "clinicB"],
      grants: [
        { clinicId: "clinicA", scope: "READ", expiresAt: null, revokedAt: null },
        { clinicId: "clinicB", scope: "READ_WRITE", expiresAt: null, revokedAt: null },
      ],
      now,
    });
    expect(r).toEqual({ level: "WRITE", via: "GRANT", clinicId: "clinicB" });
  });

  it("denies providers with no memberships", () => {
    const r = decidePetAccess({
      actor: { id: "vet1", role: "PROVIDER" },
      pet,
      memberClinicIds: [],
      grants: [{ clinicId: "clinicA", scope: "READ_WRITE", expiresAt: null, revokedAt: null }],
      now,
    });
    expect(r.level).toBe("NONE");
  });
});

describe("isGrantActive", () => {
  it("treats an expiry exactly now as expired", () => {
    expect(isGrantActive({ expiresAt: now, revokedAt: null }, now)).toBe(false);
  });
  it("treats no expiry as active", () => {
    expect(isGrantActive({ expiresAt: null, revokedAt: null }, now)).toBe(true);
  });
});
