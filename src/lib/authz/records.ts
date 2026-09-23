import type { AccessScope, Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/action-result";

export type AccessLevel = "NONE" | "READ" | "WRITE";
export type AccessVia = "OWNER" | "ADMIN" | "GRANT" | "NONE";

export type PetAccess = {
  level: AccessLevel;
  via: AccessVia;
  /** The clinic whose grant is being used (providers only). */
  clinicId?: string;
};

export type AccessActor = { id: string; role: Role };

export type AccessInput = {
  actor: AccessActor;
  pet: { id: string; ownerId: string; deletedAt: Date | null } | null;
  /** Clinic IDs the actor is an active member of. */
  memberClinicIds: string[];
  /** Grants for this pet (any clinic). */
  grants: Array<{ clinicId: string; scope: AccessScope; expiresAt: Date | null; revokedAt: Date | null }>;
  now: Date;
};

export function isGrantActive(
  grant: { expiresAt: Date | null; revokedAt: Date | null },
  now: Date,
) {
  if (grant.revokedAt) return false;
  if (grant.expiresAt && grant.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

/**
 * Pure decision function: who may read or write a pet's health records.
 *
 * - The owner may always read and write.
 * - Admins may read (support), never write clinical data.
 * - Providers may act through an active grant to a clinic they belong to.
 *   READ_WRITE grants allow adding records; READ grants are read-only.
 */
export function decidePetAccess({ actor, pet, memberClinicIds, grants, now }: AccessInput): PetAccess {
  if (!pet || pet.deletedAt) return { level: "NONE", via: "NONE" };
  if (pet.ownerId === actor.id) return { level: "WRITE", via: "OWNER" };
  if (actor.role === "ADMIN") return { level: "READ", via: "ADMIN" };
  if (actor.role !== "PROVIDER" || memberClinicIds.length === 0) return { level: "NONE", via: "NONE" };

  const clinicSet = new Set(memberClinicIds);
  let best: PetAccess = { level: "NONE", via: "NONE" };
  for (const grant of grants) {
    if (!clinicSet.has(grant.clinicId) || !isGrantActive(grant, now)) continue;
    const level: AccessLevel = grant.scope === "READ_WRITE" ? "WRITE" : "READ";
    if (level === "WRITE") return { level, via: "GRANT", clinicId: grant.clinicId };
    if (best.level === "NONE") best = { level, via: "GRANT", clinicId: grant.clinicId };
  }
  return best;
}

export async function getPetAccess(actor: AccessActor, petId: string, now = new Date()): Promise<PetAccess> {
  const pet = await db.pet.findUnique({
    where: { id: petId },
    select: { id: true, ownerId: true, deletedAt: true },
  });
  if (!pet) return { level: "NONE", via: "NONE" };
  if (pet.ownerId === actor.id || actor.role === "ADMIN") {
    return decidePetAccess({ actor, pet, memberClinicIds: [], grants: [], now });
  }
  const [memberships, grants] = await Promise.all([
    db.membership.findMany({ where: { userId: actor.id, active: true }, select: { clinicId: true } }),
    db.recordAccessGrant.findMany({
      where: { petId },
      select: { clinicId: true, scope: true, expiresAt: true, revokedAt: true },
    }),
  ]);
  return decidePetAccess({
    actor,
    pet,
    memberClinicIds: memberships.map((m) => m.clinicId),
    grants,
    now,
  });
}

/** Throws NotFoundError (so we don't reveal the pet exists) when the actor may not read. */
export async function requirePetRead(actor: AccessActor, petId: string): Promise<PetAccess> {
  const access = await getPetAccess(actor, petId);
  if (access.level === "NONE") throw new NotFoundError("Pet not found");
  return access;
}

export async function requirePetWrite(actor: AccessActor, petId: string): Promise<PetAccess> {
  const access = await getPetAccess(actor, petId);
  if (access.level === "NONE") throw new NotFoundError("Pet not found");
  if (access.level !== "WRITE") throw new ForbiddenError("You have read-only access to this pet's records");
  return access;
}

export async function requirePetOwner(actor: AccessActor, petId: string) {
  const pet = await db.pet.findFirst({ where: { id: petId, ownerId: actor.id, deletedAt: null } });
  if (!pet) throw new NotFoundError("Pet not found");
  return pet;
}
