import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";
import { ForbiddenError } from "@/lib/action-result";

export type SessionUser = { id: string; role: Role; email?: string | null; name?: string | null };

export function homeForRole(role: Role | undefined) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "PROVIDER":
      return "/provider";
    default:
      return "/owner";
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    role: session.user.role ?? "OWNER",
    email: session.user.email,
    name: session.user.name,
  };
}

/** For pages: redirect to login when signed out. */
export async function requireUser(callbackUrl?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login");
  }
  return user;
}

/** For pages: redirect users with the wrong role to their own home. Admins pass everywhere. */
export async function requireRole(role: Role, callbackUrl?: string): Promise<SessionUser> {
  const user = await requireUser(callbackUrl);
  if (user.role !== role && user.role !== "ADMIN") {
    redirect(homeForRole(user.role));
  }
  return user;
}

/** For server actions: throw instead of redirecting. */
export async function requireActor(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ForbiddenError("Please sign in");
  return user;
}

export async function requireActorRole(role: Role): Promise<SessionUser> {
  const user = await requireActor();
  if (user.role !== role && user.role !== "ADMIN") throw new ForbiddenError();
  return user;
}

export type ClinicMembership = {
  clinicId: string;
  role: "CLINIC_OWNER" | "STAFF";
  clinic: { id: string; name: string; slug: string; status: string; timezone: string };
};

/** Active clinic memberships for a user (providers normally have exactly one). */
export async function getMemberships(userId: string): Promise<ClinicMembership[]> {
  const rows = await db.membership.findMany({
    where: { userId, active: true },
    include: { clinic: { select: { id: true, name: true, slug: true, status: true, timezone: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((m) => ({ clinicId: m.clinicId, role: m.role, clinic: m.clinic }));
}

/** Throws unless the actor is an active member of the clinic (admins pass). */
export async function requireMembership(actor: SessionUser, clinicId: string) {
  if (actor.role === "ADMIN") return { clinicId, role: "CLINIC_OWNER" as const };
  const m = await db.membership.findFirst({
    where: { userId: actor.id, clinicId, active: true },
    select: { clinicId: true, role: true },
  });
  if (!m) throw new ForbiddenError("You are not a member of this clinic");
  return m;
}

/** The provider's primary clinic, or null if they have not onboarded yet. */
export async function getPrimaryMembership(userId: string) {
  const list = await getMemberships(userId);
  return list[0] ?? null;
}
